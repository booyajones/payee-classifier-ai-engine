
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

  // Manual refresh (user-initiated) - now properly handles silent parameter
  const handleRefreshJob = async (jobId: string, silent: boolean = false) => {
    try {
      console.log(`[BATCH ACTIONS] Starting refresh for job ${jobId}${silent ? ' (silent)' : ''}`);
      await refreshSpecificJob(jobId, () => baseHandleRefreshJob(jobId, silent));
    } catch (error) {
      console.error('[BATCH ACTIONS] Refresh error:', error);
    }
  };

  const handleDownloadResults = async (job: BatchJob) => {
    try {
      console.log(`[BATCH ACTIONS] Starting simple download for job ${job.id}`);
      await baseHandleDownloadResults(job);
    } catch (error) {
      console.error('[BATCH ACTIONS] Download error:', error);
      throw error;
    }
  };

  return {
    // State
    refreshingJobs,
    pollingStates,
    
    // Actions
    handleRefreshJob,
    handleDownloadResults,
    handleCancelJob
  };
};
