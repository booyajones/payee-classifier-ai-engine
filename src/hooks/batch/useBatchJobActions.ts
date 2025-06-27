
import { useCallback } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { useBatchJobDownload } from '@/hooks/useBatchJobDownload';
import { useBatchJobRefresh } from '@/hooks/useBatchJobRefresh';
import { useBatchJobCancellation } from '@/hooks/useBatchJobCancellation';
import { saveClassificationResults } from '@/lib/database/classificationService';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const { handleDownloadResults } = useBatchJobDownload({
    payeeRowDataMap,
    onJobComplete
  });
  const { refreshingJobs, handleRefreshJob, isRefreshRetrying } = useBatchJobRefresh(onJobUpdate);
  const { handleCancelJob } = useBatchJobCancellation(onJobUpdate);

  const wrappedHandleRefreshJob = useCallback(async (jobId: string) => {
    console.log(`[BATCH JOB ACTIONS] Refreshing job ${jobId}`);
    await handleRefreshJob(jobId, false);
  }, [handleRefreshJob]);

  const wrappedHandleDownloadResults = useCallback(async (job: BatchJob) => {
    const payeeData = payeeRowDataMap[job.id];
    if (!payeeData) {
      console.error(`[BATCH JOB ACTIONS] No payee data for job ${job.id}`);
      return;
    }

    await handleDownloadResults(job);
  }, [handleDownloadResults, payeeRowDataMap]);

  const wrappedHandleCancelJob = useCallback(async (jobId: string) => {
    await handleCancelJob(jobId);
  }, [handleCancelJob]);

  return {
    refreshingJobs,
    pollingStates: new Map(), // Add empty polling states for compatibility
    handleRefreshJob: wrappedHandleRefreshJob,
    handleDownloadResults: wrappedHandleDownloadResults,
    handleCancelJob: wrappedHandleCancelJob
  };
};
