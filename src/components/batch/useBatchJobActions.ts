
import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { PayeeRowData } from "@/lib/rowMapping";
import { useBatchJobPolling } from "@/hooks/useBatchJobPolling";
import { useBatchJobRefresh } from "@/hooks/useBatchJobRefresh";
import { useBatchJobDownload } from "@/hooks/useBatchJobDownload";
import { useBatchJobCancellation } from "@/hooks/useBatchJobCancellation";
import { useDownloadProgress } from "@/hooks/useDownloadProgress";

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
      console.log(`[BATCH ACTIONS] onJobComplete type:`, typeof onJobComplete);
      console.log(`[BATCH ACTIONS] onJobComplete is function:`, typeof onJobComplete === 'function');
      
      if (typeof onJobComplete === 'function') {
        console.log(`[BATCH ACTIONS] Executing onJobComplete for job ${jobId}`);
        onJobComplete(results, summary, jobId);
        console.log(`[BATCH ACTIONS] onJobComplete executed successfully for job ${jobId}`);
      } else {
        console.error('[BATCH ACTIONS] onJobComplete is not a function:', typeof onJobComplete);
        console.error('[BATCH ACTIONS] onJobComplete value:', onJobComplete);
        throw new Error(`onJobComplete callback is not a function (type: ${typeof onJobComplete})`);
      }
    } catch (error) {
      console.error('[BATCH ACTIONS] Error in onJobComplete:', error);
      throw error;
    }
  };

  const { refreshingJobs, handleRefreshJob: baseHandleRefreshJob } = useBatchJobRefresh(safeOnJobUpdate);
  
  const { pollingStates, refreshSpecificJob } = useBatchJobPolling(jobs, safeOnJobUpdate);
  const { handleCancelJob, handleCancelDownload } = useBatchJobCancellation(safeOnJobUpdate);
  
  const {
    downloadingJobs,
    downloadProgress,
    startDownload,
    updateProgress,
    finishDownload,
    cancelDownload,
    isDownloadCancelled
  } = useDownloadProgress();

  // Create a robust progress update function that never fails
  const safeUpdateProgress = (jobId: string, current: number, total: number) => {
    try {
      if (updateProgress && typeof updateProgress === 'function') {
        updateProgress(jobId, current, total);
      }
    } catch (error) {
      console.warn('[BATCH ACTIONS] Progress update failed silently:', error);
    }
  };

  const { handleDownloadResults: baseHandleDownloadResults } = useBatchJobDownload({
    payeeRowDataMap,
    onJobComplete: safeOnJobComplete,
    isDownloadCancelled,
    updateProgress: safeUpdateProgress
  });

  // Manual refresh (user-initiated) - shows toast
  const handleRefreshJob = async (jobId: string) => {
    try {
      console.log(`[BATCH ACTIONS] Starting refresh for job ${jobId}`);
      await refreshSpecificJob(jobId, () => baseHandleRefreshJob(jobId, false));
    } catch (error) {
      console.error('[BATCH ACTIONS] Refresh error:', error);
    }
  };

  const handleDownloadResults = async (job: BatchJob) => {
    try {
      console.log(`[BATCH ACTIONS] Starting download for job ${job.id}`);
      console.log(`[BATCH ACTIONS] Callbacks validation - onJobComplete:`, typeof safeOnJobComplete);
      
      if (startDownload && typeof startDownload === 'function') {
        startDownload(job.id);
      }
      await baseHandleDownloadResults(job);
    } catch (error) {
      console.error('[BATCH ACTIONS] Download error:', error);
      throw error;
    } finally {
      if (finishDownload && typeof finishDownload === 'function') {
        finishDownload(job.id);
      }
    }
  };

  const handleCancelDownloadWithCleanup = (jobId: string) => {
    try {
      if (cancelDownload && typeof cancelDownload === 'function') {
        cancelDownload(jobId);
      }
      if (handleCancelDownload && typeof handleCancelDownload === 'function') {
        handleCancelDownload(jobId);
      }
    } catch (error) {
      console.error('[BATCH ACTIONS] Cancel download error:', error);
    }
  };

  return {
    // State
    refreshingJobs,
    downloadingJobs,
    downloadProgress,
    pollingStates,
    
    // Actions
    handleRefreshJob,
    handleDownloadResults,
    handleCancelDownload: handleCancelDownloadWithCleanup,
    handleCancelJob
  };
};
