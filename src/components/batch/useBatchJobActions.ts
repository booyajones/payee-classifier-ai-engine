
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
  // Ensure onJobUpdate is properly validated before passing to hooks
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
    onJobComplete,
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
