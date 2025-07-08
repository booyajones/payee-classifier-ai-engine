
import { useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { BatchJob, checkBatchJobStatus } from "@/lib/openai/trueBatchAPI";
import { handleError, showRetryableErrorToast } from "@/lib/errorHandler";
import { useApiRetry } from "@/hooks/useRetry";
import { BatchJobUpdater } from "@/lib/database/batchJobUpdater";
import { BatchJobLoader } from "@/lib/database/batchJobLoader";
import { withRefreshTimeout } from "@/lib/openai/utils";

export const useBatchJobRefresh = (onJobUpdate: (job: BatchJob) => void) => {
  const [refreshingJobs, setRefreshingJobs] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  
  // Circuit breaker to prevent multiple simultaneous requests
  const activeRequests = useRef<Map<string, { cancel: () => void }>>(new Map());
  const lastRequestTime = useRef<Map<string, number>>(new Map());

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
    
    // Dynamic stall thresholds based on job size and progress status
    const jobSize = job.request_counts.total;
    const hasStartedProcessing = job.request_counts.completed > 0;
    
    // More generous thresholds for OpenAI Batch API
    const queueThreshold = jobSize <= 100 ? 30 * 60 * 1000 :    // 30 minutes for small jobs
                          jobSize <= 1000 ? 2 * 60 * 60 * 1000 : // 2 hours for medium jobs  
                          4 * 60 * 60 * 1000;                    // 4 hours for large jobs
    
    // Only flag jobs that haven't started processing after reasonable queue time
    const hasNoProgress = !hasStartedProcessing && timeSinceCreated > queueThreshold;
    
    // For jobs that started processing, be much more lenient
    // Only flag if job has made minimal progress and hasn't advanced in a very long time
    const hasMinimalProgress = hasStartedProcessing && 
                              job.request_counts.completed < (job.request_counts.total * 0.02) && // Less than 2% done
                              timeSinceCreated > (6 * 60 * 60 * 1000); // AND been running over 6 hours
    
    const isStalled = hasNoProgress || hasMinimalProgress;
    
    console.log(`[STALL DETECTION] Job ${job.id}: progress=${job.request_counts.completed}/${job.request_counts.total}, time=${Math.round(timeSinceCreated/60000)}min, started=${hasStartedProcessing}, stalled=${isStalled}`);
    
    return isStalled;
  };

  // EMERGENCY FIX: Direct database sync that bypasses circuit breaker
  const handleForceStatusSync = async (jobId: string) => {
    console.log(`[FORCE SYNC] Emergency status sync for job ${jobId.substring(0, 8)}`);
    
    try {
      const dbJob = await BatchJobLoader.loadBatchJobById(jobId);
      if (dbJob) {
        console.log(`[FORCE SYNC] Found job ${jobId.substring(0, 8)} with status: ${dbJob.status}`);
        onJobUpdate(dbJob);
        
        toast({
          title: "Status Synchronized",
          description: `Job ${jobId.substring(0, 8)}... status synced from database: ${dbJob.status}`,
          variant: "default",
        });
        
        return dbJob;
      } else {
        throw new Error('Job not found in database');
      }
    } catch (error) {
      console.error(`[FORCE SYNC] Error syncing job ${jobId.substring(0, 8)}:`, error);
      toast({
        title: "Sync Failed",
        description: `Could not sync status for job ${jobId.substring(0, 8)}...`,
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleRefreshJob = useCallback(async (jobId: string, silent: boolean = false) => {
    // Circuit breaker: prevent rapid repeated requests
    const now = Date.now();
    const lastRequest = lastRequestTime.current.get(jobId);
    if (lastRequest && now - lastRequest < 2000) {
      console.log(`[JOB REFRESH] Rate limited refresh request for ${jobId.substring(0, 8)} - too soon`);
      return;
    }

    // Cancel any existing request for this job
    const existingRequest = activeRequests.current.get(jobId);
    if (existingRequest) {
      console.log(`[JOB REFRESH] Cancelling existing request for ${jobId.substring(0, 8)}`);
      existingRequest.cancel();
      activeRequests.current.delete(jobId);
    }

    setRefreshingJobs(prev => new Set(prev).add(jobId));
    lastRequestTime.current.set(jobId, now);
    
    // Create cancellable request with timeout
    const { promise: refreshPromise, cancel } = withRefreshTimeout(
      checkBatchJobStatus(jobId),
      15000 // 15 second timeout for refresh operations
    );
    
    // Store the cancel function
    activeRequests.current.set(jobId, { cancel });

    try {
      console.log(`[JOB REFRESH] Refreshing job ${jobId.substring(0, 8)} with 15s timeout`);
      const updatedJob = await refreshPromise;
      console.log(`[JOB REFRESH] Job ${jobId.substring(0, 8)} status: ${updatedJob.status}, progress: ${updatedJob.request_counts.completed}/${updatedJob.request_counts.total}`);
      
      // Clean up the active request
      activeRequests.current.delete(jobId);
      
      // Check for truly stalled jobs (no forced cancellation)
      if (detectStalledJob(updatedJob)) {
        const createdTime = new Date(updatedJob.created_at * 1000);
        const timeSinceCreated = Date.now() - createdTime.getTime();
        console.warn(`[JOB REFRESH] STALLED JOB DETECTED: ${jobId.substring(0, 8)}`);
        const hasStartedProcessing = updatedJob.request_counts.completed > 0;
        
        toast({
          title: hasStartedProcessing ? "⚠️ Job Progress Stalled" : "⏳ Long Queue Time",
          description: hasStartedProcessing 
            ? `Job ${jobId.substring(0, 8)}... has made minimal progress in ${Math.round(timeSinceCreated/60000)} minutes. OpenAI batch jobs can take 12-24+ hours for large batches. Manual cancellation available if needed.`
            : `Job ${jobId.substring(0, 8)}... has been queued for ${Math.round(timeSinceCreated/60000)} minutes. This is normal during high demand periods.`,
          variant: hasStartedProcessing ? "destructive" : "default",
          duration: 12000,
        });
      }
      
      // Update job status in database and trigger automatic processing
      try {
        await BatchJobUpdater.updateBatchJobStatus(updatedJob);
      } catch (updateError) {
        console.warn(`[JOB REFRESH] Database update failed for ${jobId.substring(0, 8)}:`, updateError);
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
      // Clean up the active request
      activeRequests.current.delete(jobId);
      
      const appError = handleError(error, 'Job Status Refresh');
      console.error(`[JOB REFRESH] Error refreshing job ${jobId.substring(0, 8)}:`, error);
      
      // Handle specific error types with better user feedback
      if (error instanceof Error) {
        if (error.message.includes('cancelled') || error.message.includes('aborted')) {
          console.log(`[JOB REFRESH] Request cancelled for job ${jobId.substring(0, 8)}`);
          toast({
            title: "Refresh Cancelled",
            description: `Refresh operation was cancelled for job ${jobId.substring(0, 8)}...`,
            variant: "default",
            duration: 4000,
          });
          return; // Don't throw for cancelled requests
        } else if (error.message.includes('timed out')) {
          toast({
            title: "⏱️ API Timeout",
            description: `OpenAI API is responding slowly. Job ${jobId.substring(0, 8)}... refresh timed out after 15 seconds.`,
            variant: "destructive",
            duration: 8000,
          });
        } else if (error.message.includes('404') || error.message.includes('not found')) {
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
        } else if (error.message.includes('429') || error.message.includes('rate limit')) {
          toast({
            title: "Rate Limited",
            description: `OpenAI API rate limit reached. Please wait a moment before refreshing job ${jobId.substring(0, 8)}...`,
            variant: "destructive",
            duration: 8000,
          });
        } else {
          // Generic API error
          toast({
            title: "Refresh Failed",
            description: `Unable to refresh job ${jobId.substring(0, 8)}... - OpenAI API may be experiencing issues.`,
            variant: "destructive",
            duration: 6000,
          });
        }
      }
      
      // Only show retry option for non-timeout/non-cancelled errors
      if (!error.message.includes('cancelled') && !error.message.includes('timed out')) {
        showRetryableErrorToast(
          appError, 
          () => handleRefreshJob(jobId, silent),
          'Job Refresh'
        );
      }
      
      throw error;
    } finally {
      // Always clean up refresh state
      setRefreshingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  }, [onJobUpdate, toast, detectStalledJob]);

  return {
    refreshingJobs,
    handleRefreshJob,
    handleForceStatusSync,
    isRefreshRetrying,
    detectStalledJob
  };
};
