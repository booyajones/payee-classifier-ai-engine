
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { BatchJob, checkBatchJobStatus } from "@/lib/openai/trueBatchAPI";
import { handleError, showRetryableErrorToast } from "@/lib/errorHandler";
import { useApiRetry } from "@/hooks/useRetry";
import { BatchJobUpdater } from "@/lib/database/batchJobUpdater";

export const useBatchJobRefresh = (onJobUpdate: (job: BatchJob) => void) => {
  const [refreshingJobs, setRefreshingJobs] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const {
    execute: refreshJobWithRetry,
    isRetrying: isRefreshRetrying
  } = useApiRetry(checkBatchJobStatus, { 
    maxRetries: 2, 
    baseDelay: 1000,
    onRetry: (attempt, error) => {
      console.log(`[JOB REFRESH] Retry attempt ${attempt}: ${error.message}`);
    },
    onMaxRetriesReached: (error) => {
      console.error(`[JOB REFRESH] Max retries reached: ${error.message}`);
    }
  });

  const detectStalledJob = (job: BatchJob): boolean => {
    if (job.status !== 'in_progress') return false;
    
    // Check if job has been processing for too long
    const createdTime = new Date(job.created_at * 1000);
    const timeSinceCreated = Date.now() - createdTime.getTime();
    
    // CRITICAL: Detect runaway jobs (more than 4 hours = timeout)
    const CRITICAL_TIMEOUT = 4 * 60 * 60 * 1000; // 4 hours
    const isCriticalTimeout = timeSinceCreated > CRITICAL_TIMEOUT;
    
    // Dynamic stall thresholds based on job size  
    const jobSize = job.request_counts.total;
    const isSimpleJob = jobSize <= 100;
    const isSmallJob = jobSize <= 500;
    const isLargeJob = jobSize > 5000;
    
    const stallThreshold = isSimpleJob ? 5 * 60 * 1000 :  // 5 minutes
                          isSmallJob ? 15 * 60 * 1000 :    // 15 minutes
                          isLargeJob ? 60 * 60 * 1000 :    // 1 hour for large jobs
                          30 * 60 * 1000;                  // 30 minutes default
    
    const hasNoProgress = job.request_counts.completed === 0 && job.request_counts.total > 0;
    const hasMinimalProgress = job.request_counts.completed < (job.request_counts.total * 0.05); // Less than 5% done
    const isTakingTooLong = timeSinceCreated > stallThreshold;
    const isStalled = (hasNoProgress || hasMinimalProgress) && isTakingTooLong;
    
    console.log(`[TIMEOUT DETECTION] Job ${job.id}: progress=${job.request_counts.completed}/${job.request_counts.total}, time=${Math.round(timeSinceCreated/60000)}min, threshold=${Math.round(stallThreshold/60000)}min, critical=${isCriticalTimeout}, stalled=${isStalled}`);
    
    // Mark critical timeouts for immediate cancellation
    if (isCriticalTimeout) {
      console.error(`[CRITICAL TIMEOUT] Job ${job.id} has been running for ${Math.round(timeSinceCreated/60000)} minutes - IMMEDIATE CANCELLATION REQUIRED`);
    }
    
    return isStalled || isCriticalTimeout;
  };

  const handleRefreshJob = async (jobId: string, silent: boolean = false) => {
    setRefreshingJobs(prev => new Set(prev).add(jobId));
    try {
      console.log(`[JOB REFRESH] Refreshing job ${jobId} with stall detection`);
      const updatedJob = await refreshJobWithRetry(jobId);
      console.log(`[JOB REFRESH] Job ${jobId} status: ${updatedJob.status}, progress: ${updatedJob.request_counts.completed}/${updatedJob.request_counts.total}`);
      
      // Check for critical timeouts that need immediate action
      const createdTime = new Date(updatedJob.created_at * 1000);
      const timeSinceCreated = Date.now() - createdTime.getTime();
      const CRITICAL_TIMEOUT = 4 * 60 * 60 * 1000; // 4 hours
      const isCriticalTimeout = timeSinceCreated > CRITICAL_TIMEOUT;
      
      if (isCriticalTimeout && updatedJob.status === 'in_progress') {
        console.error(`[CRITICAL TIMEOUT] Job ${jobId} running for ${Math.round(timeSinceCreated/60000)} minutes - FORCING CANCELLATION`);
        toast({
          title: "🚨 Critical Timeout - Canceling Job",
          description: `Job ${jobId.substring(0, 8)}... has been running for over 4 hours and will be automatically canceled to prevent system issues.`,
          variant: "destructive",
          duration: 15000,
        });
        
        // Force cancel the runaway job
        try {
          const { cancelBatchJob } = await import('@/lib/openai/trueBatchAPI');
          await cancelBatchJob(jobId);
          console.log(`[CRITICAL TIMEOUT] Successfully canceled runaway job ${jobId}`);
          
          toast({
            title: "✅ Runaway Job Canceled",
            description: `Job ${jobId.substring(0, 8)}... has been canceled due to timeout. System performance should improve.`,
            duration: 10000,
          });
        } catch (cancelError) {
          console.error(`[CRITICAL TIMEOUT] Failed to cancel job ${jobId}:`, cancelError);
          toast({
            title: "❌ Failed to Cancel Job",
            description: `Could not cancel runaway job ${jobId.substring(0, 8)}... Please try manual cancellation.`,
            variant: "destructive",
            duration: 15000,
          });
        }
      } else if (detectStalledJob(updatedJob)) {
        console.warn(`[JOB REFRESH] STALLED JOB DETECTED: ${jobId}`);
        toast({
          title: "⚠️ Stalled Job Detected",
          description: `Job ${jobId.substring(0, 8)}... appears stuck with no progress after ${Math.round(timeSinceCreated/60000)} minutes. Consider canceling and retrying.`,
          variant: "destructive",
          duration: 10000,
        });
      }
      
      // Update job status in database and trigger automatic processing
      try {
        await BatchJobUpdater.updateBatchJobStatus(updatedJob);
      } catch (updateError) {
        console.warn(`[JOB REFRESH] Database update failed for ${jobId}:`, updateError);
        // Don't fail the whole refresh if database update fails
      }
      
      onJobUpdate(updatedJob);
      
      // Only show success toast for user-initiated refreshes, not automatic polling
      if (!silent) {
        toast({
          title: "Job Status Updated",
          description: `Job refreshed: ${updatedJob.status} (${updatedJob.request_counts.completed}/${updatedJob.request_counts.total})`,
        });
      }
    } catch (error) {
      const appError = handleError(error, 'Job Status Refresh');
      console.error(`[JOB REFRESH] Error refreshing job ${jobId}:`, error);
      
      // Check for specific API issues that might indicate stalled jobs
      if (error instanceof Error) {
        if (error.message.includes('404') || error.message.includes('not found')) {
          toast({
            title: "Job Not Found",
            description: `Job ${jobId.substring(0, 8)}... may have been removed from OpenAI. Consider it completed or failed.`,
            variant: "destructive",
            duration: 8000,
          });
        } else if (error.message.includes('401') || error.message.includes('authentication')) {
          toast({
            title: "API Authentication Issue",
            description: "OpenAI API key may be invalid. Check your API key settings.",
            variant: "destructive",
            duration: 8000,
          });
        }
      }
      
      showRetryableErrorToast(
        appError, 
        () => handleRefreshJob(jobId, silent),
        'Job Refresh'
      );
      throw error;
    } finally {
      setRefreshingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  };

  return {
    refreshingJobs,
    handleRefreshJob,
    isRefreshRetrying,
    detectStalledJob
  };
};
