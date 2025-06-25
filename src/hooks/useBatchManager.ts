
import { useCallback, useEffect, useRef } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { useBatchJobState } from './batch/useBatchJobState';
import { useBatchJobActions } from './batch/useBatchJobActions';
import { useBatchJobLoader } from './batch/useBatchJobLoader';
import { useBatchJobEventListener, emitBatchJobUpdate } from './batch/useBatchJobEventEmitter';

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
    setError
  } = useBatchJobState();

  const {
    createBatch,
    updateJobStatus,
    deleteJob,
    clearAll
  } = useBatchJobActions(addJob, updateJob, removeJob, clearAllJobs, setError);

  const { refreshJobs } = useBatchJobLoader(updateJobs, updatePayeeDataMap, setLoaded);

  // Use ref to prevent multiple simultaneous refresh attempts
  const refreshInProgress = useRef(false);

  // Listen for job updates from other components
  useEffect(() => {
    const handleJobUpdate = async () => {
      // Prevent multiple simultaneous refreshes
      if (refreshInProgress.current) {
        console.log('[BATCH MANAGER] Refresh already in progress, skipping...');
        return;
      }

      try {
        refreshInProgress.current = true;
        console.log('[BATCH MANAGER] Received job update event, refreshing jobs...');
        await refreshJobs(true);
      } catch (error) {
        console.error('[BATCH MANAGER] Error during event-triggered refresh:', error);
      } finally {
        refreshInProgress.current = false;
      }
    };

    const unsubscribe = useBatchJobEventListener(handleJobUpdate);
    
    return unsubscribe;
  }, [refreshJobs]);

  return {
    // State
    jobs: state.jobs,
    payeeDataMap: state.payeeDataMap,
    processing: state.processing,
    errors: state.errors,
    isLoaded: state.isLoaded,
    
    // Actions
    createBatch,
    updateJob: updateJobStatus,
    deleteJob: (jobId: string) => deleteJob(jobId),
    clearAll: () => clearAll(state.jobs),
    refreshJobs: useCallback(async (silent = false) => {
      if (refreshInProgress.current) {
        console.log('[BATCH MANAGER] Manual refresh already in progress, skipping...');
        return;
      }
      
      try {
        refreshInProgress.current = true;
        await refreshJobs(silent);
      } finally {
        refreshInProgress.current = false;
      }
    }, [refreshJobs]),
    
    // Utilities
    getJobData: useCallback((jobId: string) => state.payeeDataMap[jobId], [state.payeeDataMap]),
    isProcessing: useCallback((jobId: string) => state.processing.has(jobId), [state.processing]),
    getError: useCallback((jobId: string) => state.errors[jobId], [state.errors])
  };
};

// Export the event emitter function for external use
export { emitBatchJobUpdate };
