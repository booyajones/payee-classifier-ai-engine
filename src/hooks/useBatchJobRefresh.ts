
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
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

  const handleRefreshJob = async (jobId: string) => {
    setRefreshingJobs(prev => new Set(prev).add(jobId));
    try {
      console.log(`[JOB REFRESH] Refreshing job ${jobId}`);
      const updatedJob = await refreshJobWithRetry(jobId);
      console.log(`[JOB REFRESH] Job ${jobId} updated status:`, updatedJob.status);
      onJobUpdate(updatedJob);
      
      toast({
        title: "Job Status Updated",
        description: `Job status refreshed: ${updatedJob.status}`,
      });
    } catch (error) {
      const appError = handleError(error, 'Job Status Refresh');
      console.error(`[JOB REFRESH] Error refreshing job ${jobId}:`, error);
      
      showRetryableErrorToast(
        appError, 
        () => handleRefreshJob(jobId),
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
    isRefreshRetrying
  };
};
