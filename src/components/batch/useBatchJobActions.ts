
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
  // Ensure onJobUpdate is passed to the refresh hook
  const { refreshingJobs, handleRefreshJob: baseHandleRefreshJob } = useBatchJobRefresh(onJobUpdate);
  
  const { pollingStates, refreshSpecificJob } = useBatchJobPolling(jobs, onJobUpdate);
  const { handleCancelJob, handleCancelDownload } = useBatchJobCancellation(onJobUpdate);
  
  const {
    downloadingJobs,
    downloadProgress,
    startDownload,
    updateProgress,
    finishDownload,
    cancelDownload,
    isDownloadCancelled
  } = useDownloadProgress();

  // Create a safe updateProgress function that ensures it's always defined
  const safeUpdateProgress = (jobId: string, current: number, total: number) => {
    try {
      if (typeof updateProgress === 'function') {
        updateProgress(jobId, current, total);
      } else {
        console.warn('[BATCH ACTIONS] updateProgress is not a function, skipping progress update');
      }
    } catch (error) {
      console.error('[BATCH ACTIONS] Error in updateProgress:', error);
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
    await refreshSpecificJob(jobId, () => baseHandleRefreshJob(jobId, false));
  };

  // Auto refresh (system-initiated) - silent
  const handleAutoRefreshJob = async (jobId: string) => {
    await refreshSpecificJob(jobId, () => baseHandleRefreshJob(jobId, true));
  };

  const handleDownloadResults = async (job: BatchJob) => {
    try {
      startDownload(job.id);
      await baseHandleDownloadResults(job);
    } catch (error) {
      console.error('[BATCH ACTIONS] Download error:', error);
      throw error;
    } finally {
      finishDownload(job.id);
    }
  };

  const handleCancelDownloadWithCleanup = (jobId: string) => {
    try {
      cancelDownload(jobId);
      handleCancelDownload(jobId);
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
    handleAutoRefreshJob,
    handleDownloadResults,
    handleCancelDownload: handleCancelDownloadWithCleanup,
    handleCancelJob
  };
};
