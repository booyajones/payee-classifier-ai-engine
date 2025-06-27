
import { useState, useCallback, useRef } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';

interface BatchJobState {
  jobs: BatchJob[];
  payeeDataMap: Record<string, PayeeRowData>;
  processing: Set<string>;
  errors: Record<string, string>;
  isLoaded: boolean;
}

export const useBatchJobState = () => {
  const [state, setState] = useState<BatchJobState>({
    jobs: [],
    payeeDataMap: {},
    processing: new Set(),
    errors: {},
    isLoaded: false
  });

  // Prevent concurrent state updates
  const updateInProgress = useRef(false);
  const pendingUpdates = useRef<(() => void)[]>([]);

  const processPendingUpdates = useCallback(() => {
    if (updateInProgress.current || pendingUpdates.current.length === 0) {
      return;
    }

    updateInProgress.current = true;
    
    // Process all pending updates in a single batch
    const updates = [...pendingUpdates.current];
    pendingUpdates.current = [];
    
    setState(prevState => {
      let newState = prevState;
      updates.forEach(update => {
        update();
      });
      return newState;
    });

    updateInProgress.current = false;
    
    // Process any new updates that came in during processing
    setTimeout(processPendingUpdates, 0);
  }, []);

  const safeSetState = useCallback((updater: (prevState: BatchJobState) => BatchJobState) => {
    if (updateInProgress.current) {
      // Queue the update for later processing
      pendingUpdates.current.push(() => {
        setState(updater);
      });
      setTimeout(processPendingUpdates, 0);
    } else {
      setState(updater);
    }
  }, [processPendingUpdates]);

  const updateJobs = useCallback((jobs: BatchJob[]) => {
    console.log(`[BATCH STATE] Updating jobs list with ${jobs.length} jobs`);
    safeSetState(prev => ({ ...prev, jobs }));
  }, [safeSetState]);

  const updatePayeeDataMap = useCallback((payeeDataMap: Record<string, PayeeRowData>) => {
    console.log(`[BATCH STATE] Updating payee data map with ${Object.keys(payeeDataMap).length} entries`);
    safeSetState(prev => ({ ...prev, payeeDataMap }));
  }, [safeSetState]);

  const addJob = useCallback((job: BatchJob, payeeRowData: PayeeRowData) => {
    console.log(`[BATCH STATE] Adding job ${job.id} to state`);
    safeSetState(prev => ({
      ...prev,
      jobs: [...prev.jobs.filter(j => j.id !== job.id), job], // Prevent duplicates
      payeeDataMap: { ...prev.payeeDataMap, [job.id]: payeeRowData }
    }));
  }, [safeSetState]);

  const updateJob = useCallback((updatedJob: BatchJob) => {
    console.log(`[BATCH STATE] Updating job ${updatedJob.id} with status: ${updatedJob.status}`);
    safeSetState(prev => ({
      ...prev,
      jobs: prev.jobs.map(job => job.id === updatedJob.id ? updatedJob : job)
    }));
  }, [safeSetState]);

  const removeJob = useCallback((jobId: string) => {
    console.log(`[BATCH STATE] Removing job ${jobId} from state`);
    safeSetState(prev => {
      const updatedJobs = prev.jobs.filter(job => job.id !== jobId);
      const updatedPayeeDataMap = Object.fromEntries(
        Object.entries(prev.payeeDataMap).filter(([id]) => id !== jobId)
      );
      const updatedErrors = Object.fromEntries(
        Object.entries(prev.errors).filter(([id]) => id !== jobId)
      );
      
      return {
        ...prev,
        jobs: updatedJobs,
        payeeDataMap: updatedPayeeDataMap,
        errors: updatedErrors
      };
    });
  }, [safeSetState]);

  const clearAllJobs = useCallback(() => {
    console.log('[BATCH STATE] Clearing all jobs from state');
    safeSetState(() => ({
      jobs: [],
      payeeDataMap: {},
      processing: new Set(),
      errors: {},
      isLoaded: true
    }));
  }, [safeSetState]);

  const setLoaded = useCallback((isLoaded: boolean) => {
    console.log(`[BATCH STATE] Setting loaded state to: ${isLoaded}`);
    safeSetState(prev => ({ ...prev, isLoaded }));
  }, [safeSetState]);

  const setError = useCallback((jobId: string, error: string) => {
    console.log(`[BATCH STATE] Setting error for job ${jobId}: ${error}`);
    safeSetState(prev => ({
      ...prev,
      errors: { ...prev.errors, [jobId]: error }
    }));
  }, [safeSetState]);

  const clearError = useCallback((jobId: string) => {
    console.log(`[BATCH STATE] Clearing error for job ${jobId}`);
    safeSetState(prev => {
      const updatedErrors = { ...prev.errors };
      delete updatedErrors[jobId];
      return { ...prev, errors: updatedErrors };
    });
  }, [safeSetState]);

  return {
    state,
    setState: safeSetState,
    updateJobs,
    updatePayeeDataMap,
    addJob,
    updateJob,
    removeJob,
    clearAllJobs,
    setLoaded,
    setError,
    clearError
  };
};
