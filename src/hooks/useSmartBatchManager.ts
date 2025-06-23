
import { useCallback } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { useChunkedBatchManager } from './useChunkedBatchManager';
import { useSmartBatchMonitoring } from './useSmartBatchMonitoring';

export const useSmartBatchManager = () => {
  const { createChunkedBatchJob, getChunkedProgress, isChunkedJob, parentJobMetadata } = useChunkedBatchManager();
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
    // Check if this is a chunked job using our metadata
    if (isChunkedJob(jobId)) {
      const chunkedProgress = getChunkedProgress(jobId);
      const metadata = parentJobMetadata[jobId];
      
      return {
        isProcessing: chunkedProgress.completedChunks < chunkedProgress.totalChunks,
        currentStage: chunkedProgress.status,
        progress: chunkedProgress.overall,
        autoRetryCount: 0,
        hasQuotaIssue: false,
        isChunked: true,
        totalChunks: metadata?.totalChunks || 0,
        completedChunks: metadata?.completedChunks || 0
      };
    }

    // Regular job state
    const regularState = getSmartState(jobId);
    return {
      ...regularState,
      isChunked: false
    };
  }, [getSmartState, getChunkedProgress, isChunkedJob, parentJobMetadata]);

  return {
    createSmartBatchJob,
    getSmartState: getEnhancedSmartState,
    cleanup,
    isChunkedJob
  };
};
