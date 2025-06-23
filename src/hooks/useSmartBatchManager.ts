
import { useCallback } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { useChunkedBatchManager } from './useChunkedBatchManager';
import { useSmartBatchMonitoring } from './useSmartBatchMonitoring';

export const useSmartBatchManager = () => {
  const { createChunkedBatchJob, getChunkedProgress } = useChunkedBatchManager();
  const { getSmartState, cleanup } = useSmartBatchMonitoring();

  const createSmartBatchJob = useCallback(async (
    payeeRowData: PayeeRowData,
    description?: string,
    onJobUpdate?: (job: BatchJob) => void,
    onJobComplete?: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void
  ): Promise<BatchJob | null> => {
    console.log(`[SMART BATCH] Creating batch job for ${payeeRowData.uniquePayeeNames.length} unique payees`);
    
    // Use chunked batch manager which will automatically handle large files
    return await createChunkedBatchJob(payeeRowData, description, onJobUpdate, onJobComplete);
  }, [createChunkedBatchJob]);

  const getEnhancedSmartState = useCallback((jobId: string) => {
    // Check if this is a chunked job
    if (jobId.startsWith('chunked-')) {
      const chunkedProgress = getChunkedProgress(jobId);
      return {
        isProcessing: chunkedProgress.completedChunks < chunkedProgress.totalChunks,
        currentStage: chunkedProgress.status,
        progress: chunkedProgress.overall,
        autoRetryCount: 0,
        hasQuotaIssue: false
      };
    }

    // Regular job state
    return getSmartState(jobId);
  }, [getSmartState, getChunkedProgress]);

  return {
    createSmartBatchJob,
    getSmartState: getEnhancedSmartState,
    cleanup
  };
};
