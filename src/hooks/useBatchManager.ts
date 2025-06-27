
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

  const { refreshJobs } = useBatchJobLoader(updateJobs, updatePayeeDataMap, setLoaded);

  // Use refs to prevent multiple simultaneous operations - but allow per-job operations
  const refreshInProgress = useRef<Set<string>>(new Set());
  const eventListenerActive = useRef(false);

  // Listen for job updates from other components with improved handling
  useEffect(() => {
    const handleJobUpdate = async () => {
      // Prevent multiple simultaneous event handlers
      if (eventListenerActive.current) {
        console.log('[BATCH MANAGER] Event handler already active, skipping...');
        return;
      }

      eventListenerActive.current = true;
      
      try {
        // Shorter delay for more responsive updates
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('[BATCH MANAGER] Received job update event, refreshing jobs...');
        await refreshJobs(true);
      } catch (error) {
        console.error('[BATCH MANAGER] Error during event-triggered refresh:', error);
      } finally {
        eventListenerActive.current = false;
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
    
    // Actions - simplified to match actual available functionality
    refreshJobs: useCallback(async (silent = false) => {
      // Allow individual job refreshes to proceed
      if (refreshInProgress.current.has('global')) {
        console.log('[BATCH MANAGER] Global refresh already in progress, skipping...');
        return;
      }
      
      try {
        refreshInProgress.current.add('global');
        await refreshJobs(silent);
      } finally {
        refreshInProgress.current.delete('global');
      }
    }, [refreshJobs]),
    
    // New method for individual job refresh
    refreshJob: useCallback(async (jobId: string, silent = false) => {
      // Allow individual job refreshes even during global refresh
      if (refreshInProgress.current.has(jobId)) {
        console.log(`[BATCH MANAGER] Job ${jobId} refresh already in progress, skipping...`);
        return;
      }
      
      try {
        refreshInProgress.current.add(jobId);
        // Emit update to trigger refresh
        emitBatchJobUpdate();
      } finally {
        refreshInProgress.current.delete(jobId);
      }
    }, []),
    
    // Utilities
    getJobData: useCallback((jobId: string) => state.payeeDataMap[jobId], [state.payeeDataMap]),
    isProcessing: useCallback((jobId: string) => state.processing.has(jobId), [state.processing]),
    getError: useCallback((jobId: string) => state.errors[jobId], [state.errors])
  };
};

// Export the event emitter function for external use
export { emitBatchJobUpdate };
