
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { BatchJob, checkBatchJobStatus } from "@/lib/openai/trueBatchAPI";
import { handleError, showRetryableErrorToast } from "@/lib/errorHandler";
import { useRetry } from "@/hooks/useRetry";

export const useBatchJobRefresh = (onJobUpdate: (job: BatchJob) => void) => {
  const [refreshingJobs, setRefreshingJobs] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const {
    execute: refreshJobWithRetry,
    isRetrying: isRefreshRetrying
  } = useRetry(checkBatchJobStatus, { maxRetries: 2, baseDelay: 1000 });

  const handleRefreshJob = async (jobId: string) => {
    setRefreshingJobs(prev => new Set(prev).add(jobId));
    try {
      console.log(`[DEBUG] Refreshing job ${jobId}`);
      const updatedJob = await refreshJobWithRetry(jobId);
      console.log(`[DEBUG] Job ${jobId} updated status:`, updatedJob.status);
      onJobUpdate(updatedJob);
    } catch (error) {
      const appError = handleError(error, 'Job Status Refresh');
      console.error(`[DEBUG] Error refreshing job ${jobId}:`, error);
      
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
