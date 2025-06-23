
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

  const { handleCancelJob, handleCancelDownload } = useBatchJobCancellation(onJobUpdate);

  // Manual refresh (user-initiated) - shows toast
  const handleRefreshJob = async (jobId: string) => {
    const refreshFunction = async () => {
      await baseHandleRefreshJob(jobId, false); // false = not silent, show toast
    };
    await refreshSpecificJob(jobId, refreshFunction);
  };

  // Auto refresh (system-initiated) - silent
  const handleAutoRefreshJob = async (jobId: string) => {
    const refreshFunction = async () => {
      await baseHandleRefreshJob(jobId, true); // true = silent, no toast
    };
    await refreshSpecificJob(jobId, refreshFunction);
  };

  const handleDownloadResults = async (job: BatchJob) => {
    const resultKey = `${job.id}-results`;
    
    startDownload(job.id);
    
    try {
      await baseHandleDownloadResults(job);
    } finally {
      finishDownload(job.id);
    }
  };

  return {
    refreshingJobs,
    downloadingJobs,
    downloadProgress,
    pollingStates,
    handleRefreshJob,
    handleAutoRefreshJob, // Add silent version for auto-polling
    handleDownloadResults,
    handleCancelDownload: (jobId: string) => {
      cancelDownload(jobId);
      handleCancelDownload(jobId);
    },
    handleCancelJob
  };
};
