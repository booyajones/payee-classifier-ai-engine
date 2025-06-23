
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
  const { pollingStates, refreshSpecificJob } = useBatchJobPolling(jobs, onJobUpdate);
  const { refreshingJobs, handleRefreshJob: baseHandleRefreshJob } = useBatchJobRefresh(onJobUpdate);
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

  const { handleDownloadResults: baseHandleDownloadResults } = useBatchJobDownload({
    payeeRowDataMap,
    onJobComplete,
    isDownloadCancelled,
    updateProgress
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
    startDownload(job.id);
    
    try {
      await baseHandleDownloadResults(job);
    } finally {
      finishDownload(job.id);
    }
  };

  const handleCancelDownloadWithCleanup = (jobId: string) => {
    cancelDownload(jobId);
    handleCancelDownload(jobId);
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
