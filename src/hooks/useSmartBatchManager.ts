
import { useCallback } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { useSmartBatchCreation } from './useSmartBatchCreation';
import { useSmartBatchMonitoring } from './useSmartBatchMonitoring';

export const useSmartBatchManager = () => {
  const { createBatchWithFallback, handleQuotaFallback } = useSmartBatchCreation();
  const { 
    initializeSmartState, 
    startIntelligentMonitoring, 
    getSmartState, 
    cleanup 
  } = useSmartBatchMonitoring();

  const createSmartBatchJob = useCallback(async (
    payeeRowData: PayeeRowData,
    description?: string,
    onJobUpdate?: (job: BatchJob) => void,
    onJobComplete?: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void
  ): Promise<BatchJob | null> => {
    try {
      const job = await createBatchWithFallback(payeeRowData, description);
      
      if (!job) {
        // Local processing was used
        const localResults = await handleQuotaFallback(payeeRowData);
        return null;
      }

      // Initialize smart state and start monitoring
      initializeSmartState(job.id);
      startIntelligentMonitoring(job, payeeRowData, onJobUpdate, onJobComplete);

      return job;

    } catch (error) {
      console.error('[SMART BATCH] Job creation failed:', error);
      throw error;
    }
  }, [createBatchWithFallback, handleQuotaFallback, initializeSmartState, startIntelligentMonitoring]);

  return {
    createSmartBatchJob,
    getSmartState,
    cleanup
  };
};
