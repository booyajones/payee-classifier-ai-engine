
import { useCallback } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { useBatchJobState } from './batch/useBatchJobState';
import { useBatchJobLoader } from './batch/useBatchJobLoader';
import { useBatchJobCreation } from './batch/useBatchJobCreation';
import { useBatchJobDeletion } from './batch/useBatchJobDeletion';
import { useBatchJobRefresh } from './batch/useBatchJobRefresh';
import { useBatchJobEventHandling } from './batch/useBatchJobEventHandling';
import { useAutomaticFileGeneration } from './useAutomaticFileGeneration';
import { handleError } from '@/lib/errorHandler';

interface BatchCreationOptions {
  description?: string;
  onJobUpdate?: (job: BatchJob) => void;
  onJobComplete?: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
  silent?: boolean;
}

export const useBatchManager = () => {
  const {
    state,
    updateJobs,
    updatePayeeDataMap,
    addJob,
    updateJob,
    removeJob,
    clearAllJobs,
    setLoaded,
    setError,
    clearError
  } = useBatchJobState();

  const { refreshJobs } = useBatchJobLoader(updateJobs, updatePayeeDataMap, setLoaded);
  const { createBatch } = useBatchJobCreation(addJob, setError, clearError);
  const { deleteJob } = useBatchJobDeletion(removeJob, clearError, setError);
  const { performRefresh } = useBatchJobRefresh(refreshJobs, clearError, setError);
  
  // Set up event handling for job updates
  useBatchJobEventHandling(refreshJobs, setError);
  
  // Enable automatic file generation for completed jobs
  useAutomaticFileGeneration(true);

  // Update job function with error handling
  const updateJobInManager = useCallback((job: BatchJob) => {
    try {
      console.log(`[BATCH MANAGER] Updating job ${job.id} with status: ${job.status}`);
      updateJob(job);
      clearError(job.id); // Clear any previous errors when job updates successfully
    } catch (error) {
      console.error(`[BATCH MANAGER] Error updating job ${job.id}:`, error);
      const appError = handleError(error, 'Job Update');
      setError(job.id, appError.message);
    }
  }, [updateJob, clearError, setError]);

  return {
    // State
    jobs: state.jobs,
    payeeDataMap: state.payeeDataMap,
    processing: state.processing,
    errors: state.errors,
    isLoaded: state.isLoaded,
    
    // Actions with enhanced error handling
    refreshJobs: performRefresh,
    createBatch,
    updateJob: updateJobInManager,
    deleteJob,
    
    // Utilities
    getJobData: useCallback((jobId: string) => state.payeeDataMap[jobId], [state.payeeDataMap]),
    isProcessing: useCallback((jobId: string) => state.processing.has(jobId), [state.processing]),
    getError: useCallback((jobId: string) => state.errors[jobId], [state.errors]),
    hasError: useCallback((jobId?: string) => {
      if (jobId) return Boolean(state.errors[jobId]);
      return Object.keys(state.errors).length > 0;
    }, [state.errors])
  };
};

// Export the event emitter function for external use
export { emitBatchJobUpdate } from './batch/useBatchJobEventEmitter';
