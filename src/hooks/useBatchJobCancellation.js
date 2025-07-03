import { useState } from 'react';
import { cancelBatchJob } from '@/lib/openai/trueBatchAPI';
import { handleError, showRetryableErrorToast } from '@/lib/errorHandler';
import { useApiRetry } from './useRetry';

export const useBatchJobCancellation = (onJobUpdate) => {
  const [cancellingJobs, setCancellingJobs] = useState(new Set());

  const {
    execute: cancelJobWithRetry,
    isRetrying: isCancelRetrying
  } = useApiRetry(cancelBatchJob, {
    maxRetries: 2,
    baseDelay: 1000,
    onRetry: (attempt, error) => {
      productionLogger.debug(`[JOB CANCEL] Retry attempt ${attempt}: ${error.message}`);
    },
    onMaxRetriesReached: (error) => {
      productionLogger.error(`[JOB CANCEL] Max retries reached: ${error.message}`);
    }
  });

  const handleCancelJob = async (jobId) => {
    if (cancellingJobs.has(jobId)) {
      productionLogger.debug(`[JOB CANCEL] Job ${jobId} is already being cancelled`);
      return;
    }

    setCancellingJobs(prev => new Set(prev).add(jobId));
    
    try {
      productionLogger.debug(`[JOB CANCEL] Cancelling job ${jobId}`);
      const cancelledJob = await cancelJobWithRetry(jobId);
      productionLogger.debug(`[JOB CANCEL] Job ${jobId} cancelled successfully`);
      
      onJobUpdate(cancelledJob);
      
    } catch (error) {
      const appError = handleError(error, 'Job Cancellation');
      productionLogger.error(`[JOB CANCEL] Error cancelling job ${jobId}:`, error);
      
      showRetryableErrorToast(
        appError,
        () => handleCancelJob(jobId),
        'Job Cancellation'
      );
      throw error;
    } finally {
      setCancellingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  };

  return {
    cancellingJobs,
    handleCancelJob,
    isCancelRetrying
  };
};