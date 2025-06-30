
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { BatchJob, checkBatchJobStatus } from "@/lib/openai/trueBatchAPI";
import { handleError, showRetryableErrorToast } from "@/lib/errorHandler";
import { useApiRetry } from "@/hooks/useRetry";

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
    
    // Check if job has been processing for too long with no progress
    const createdTime = new Date(job.created_at * 1000);
    const timeSinceCreated = Date.now() - createdTime.getTime();
    const thirtyMinutes = 30 * 60 * 1000;
    
    const hasNoProgress = job.request_counts.completed === 0 && job.request_counts.total > 0;
    const isTakingTooLong = timeSinceCreated > thirtyMinutes;
    
    console.log(`[STALL DETECTION] Job ${job.id}: progress=${job.request_counts.completed}/${job.request_counts.total}, time=${Math.round(timeSinceCreated/60000)}min, stalled=${hasNoProgress && isTakingTooLong}`);
    
    return hasNoProgress && isTakingTooLong;
  };

  const handleRefreshJob = async (jobId: string, silent: boolean = false) => {
    setRefreshingJobs(prev => new Set(prev).add(jobId));
    try {
      console.log(`[JOB REFRESH] Refreshing job ${jobId} with stall detection`);
      const updatedJob = await refreshJobWithRetry(jobId);
      console.log(`[JOB REFRESH] Job ${jobId} status: ${updatedJob.status}, progress: ${updatedJob.request_counts.completed}/${updatedJob.request_counts.total}`);
      
      // Check if job appears stalled
      if (detectStalledJob(updatedJob)) {
        console.warn(`[JOB REFRESH] STALLED JOB DETECTED: ${jobId}`);
        toast({
          title: "⚠️ Stalled Job Detected",
          description: `Job ${jobId.substring(0, 8)}... appears stuck with no progress after 30+ minutes. Consider canceling and retrying.`,
          variant: "destructive",
          duration: 10000,
        });
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
