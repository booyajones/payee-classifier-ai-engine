
import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { PayeeRowData } from "@/lib/rowMapping";
import { useBatchJobPolling } from "@/hooks/useBatchJobPolling";
import { useBatchJobRefresh } from "@/hooks/useBatchJobRefresh";
import { useBatchJobDownload } from "@/hooks/useBatchJobDownload";
import { useBatchJobCancellation } from "@/hooks/useBatchJobCancellation";

interface UseBatchJobActionsProps {
  jobs: BatchJob[];
  payeeRowDataMap: Record<string, PayeeRowData>;
  onJobUpdate: (job: BatchJob) => void;
  onJobComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
}

export const useBatchJobActions = ({
  jobs,
  payeeRowDataMap,
  onJobUpdate,
  onJobComplete
}: UseBatchJobActionsProps) => {
  // Validate and wrap onJobUpdate with error handling
  const safeOnJobUpdate = (job: BatchJob) => {
    try {
      if (typeof onJobUpdate === 'function') {
        console.log(`[BATCH ACTIONS] Calling onJobUpdate for job ${job.id}`);
        onJobUpdate(job);
      } else {
        console.error('[BATCH ACTIONS] onJobUpdate is not a function:', typeof onJobUpdate);
      }
    } catch (error) {
      console.error('[BATCH ACTIONS] Error in onJobUpdate:', error);
    }
  };

  // Validate and wrap onJobComplete with error handling
  const safeOnJobComplete = (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => {
    try {
      console.log(`[BATCH ACTIONS] onJobComplete called for job ${jobId} with ${results.length} results`);
      
      if (typeof onJobComplete === 'function') {
        console.log(`[BATCH ACTIONS] Executing onJobComplete for job ${jobId}`);
        onJobComplete(results, summary, jobId);
        console.log(`[BATCH ACTIONS] onJobComplete executed successfully for job ${jobId}`);
      } else {
        console.error('[BATCH ACTIONS] onJobComplete is not a function:', typeof onJobComplete);
        throw new Error(`onJobComplete callback is not a function (type: ${typeof onJobComplete})`);
      }
    } catch (error) {
      console.error('[BATCH ACTIONS] Error in onJobComplete:', error);
      throw error;
    }
  };

  const { refreshingJobs, handleRefreshJob: baseHandleRefreshJob } = useBatchJobRefresh(safeOnJobUpdate);
  const { pollingStates, refreshSpecificJob } = useBatchJobPolling(jobs, safeOnJobUpdate);
  const { handleCancelJob } = useBatchJobCancellation(safeOnJobUpdate);
  
  const { handleDownloadResults: baseHandleDownloadResults } = useBatchJobDownload({
    payeeRowDataMap,
    onJobComplete: safeOnJobComplete
  });

  // Manual refresh (user-initiated) with better error handling
  const handleRefreshJob = async (jobId: string, silent: boolean = false) => {
    try {
      console.log(`[BATCH ACTIONS] Starting refresh for job ${jobId}${silent ? ' (silent)' : ''}`);
      
      // Validate jobId parameter
      if (!jobId || typeof jobId !== 'string') {
        throw new Error(`Invalid jobId: ${jobId}`);
      }
      
      // Call refresh with proper parameters
      await refreshSpecificJob(jobId, () => baseHandleRefreshJob(jobId, silent));
      
      console.log(`[BATCH ACTIONS] Refresh completed for job ${jobId}`);
    } catch (error) {
      console.error(`[BATCH ACTIONS] Refresh error for job ${jobId}:`, error);
      throw error;
    }
  };

  const handleDownloadResults = async (job: BatchJob) => {
    try {
      console.log(`[BATCH ACTIONS] Starting download for job ${job.id}`);
      
      // Validate job parameter
      if (!job || !job.id) {
        throw new Error('Invalid job object provided to download');
      }
      
      await baseHandleDownloadResults(job);
      console.log(`[BATCH ACTIONS] Download completed for job ${job.id}`);
    } catch (error) {
      console.error(`[BATCH ACTIONS] Download error for job ${job?.id}:`, error);
      throw error;
    }
  };

  // Wrapper for cancel job with validation
  const handleCancelJobWithValidation = async (jobId: string) => {
    try {
      console.log(`[BATCH ACTIONS] Starting cancellation for job ${jobId}`);
      
      // Validate jobId parameter
      if (!jobId || typeof jobId !== 'string') {
        throw new Error(`Invalid jobId for cancellation: ${jobId}`);
      }
      
      await handleCancelJob(jobId);
      console.log(`[BATCH ACTIONS] Cancellation completed for job ${jobId}`);
    } catch (error) {
      console.error(`[BATCH ACTIONS] Cancellation error for job ${jobId}:`, error);
      throw error;
    }
  };

  return {
    // State
    refreshingJobs,
    pollingStates,
    
    // Actions with improved error handling
    handleRefreshJob,
    handleDownloadResults,
    handleCancelJob: handleCancelJobWithValidation
  };
};
