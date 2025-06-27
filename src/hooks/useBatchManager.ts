
import { useCallback, useEffect, useRef } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { useBatchJobState } from './batch/useBatchJobState';
import { useBatchJobActions } from './batch/useBatchJobActions';
import { useBatchJobLoader } from './batch/useBatchJobLoader';
import { useBatchJobEventListener, emitBatchJobUpdate } from './batch/useBatchJobEventEmitter';
import { createBatchJob } from '@/lib/openai/trueBatchAPI';
import { deleteBatchJob } from '@/lib/database/batchJobService';
import { useToast } from '@/hooks/use-toast';

interface BatchCreationOptions {
  description?: string;
  onJobUpdate?: (job: BatchJob) => void;
  onJobComplete?: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
  silent?: boolean;
}

export const useBatchManager = () => {
  const { toast } = useToast();
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

  // Create batch job function with proper options handling
  const createBatch = useCallback(async (
    payeeRowData: PayeeRowData,
    options: BatchCreationOptions = {}
  ): Promise<BatchJob | null> => {
    try {
      console.log(`[BATCH MANAGER] Creating batch job for ${payeeRowData.uniquePayeeNames.length} payees`);
      
      // Create the batch job with the correct parameters
      const job = await createBatchJob(
        payeeRowData.uniquePayeeNames, 
        options.description || 'Batch Classification Job'
      );
      
      if (job) {
        // Add the job to state with the payee data
        addJob(job, payeeRowData);
        
        // Call the onJobUpdate callback if provided
        if (options.onJobUpdate) {
          options.onJobUpdate(job);
        }
        
        console.log(`[BATCH MANAGER] Batch job created successfully: ${job.id}`);
        
        // Emit batch job update to refresh UI
        emitBatchJobUpdate();
      }
      
      return job;
    } catch (error) {
      console.error('[BATCH MANAGER] Failed to create batch job:', error);
      
      if (!options.silent) {
        setError('create', error instanceof Error ? error.message : 'Failed to create batch job');
      }
      
      return null;
    }
  }, [addJob, setError]);

  // Delete job function with database deletion
  const deleteJob = useCallback(async (jobId: string) => {
    try {
      console.log(`[BATCH MANAGER] Deleting job ${jobId} from database and local state`);
      
      // Delete from database first
      await deleteBatchJob(jobId);
      
      // Remove from local state
      removeJob(jobId);
      
      // Emit update to refresh UI
      emitBatchJobUpdate();
      
      // Show success toast
      toast({
        title: "Job Deleted",
        description: "Batch job has been successfully removed.",
      });
      
      console.log(`[BATCH MANAGER] Successfully deleted job ${jobId}`);
    } catch (error) {
      console.error(`[BATCH MANAGER] Error deleting job ${jobId}:`, error);
      
      // Show error toast
      toast({
        title: "Delete Failed",
        description: `Failed to delete batch job: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  }, [removeJob, toast]);

  // Update job function
  const updateJobInManager = useCallback((job: BatchJob) => {
    console.log(`[BATCH MANAGER] Updating job ${job.id} with status: ${job.status}`);
    updateJob(job);
    emitBatchJobUpdate();
  }, [updateJob]);

  return {
    // State
    jobs: state.jobs,
    payeeDataMap: state.payeeDataMap,
    processing: state.processing,
    errors: state.errors,
    isLoaded: state.isLoaded,
    
    // Actions - properly exported functions
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
    
    // Core batch operations
    createBatch,
    updateJob: updateJobInManager,
    deleteJob,
    
    // Utilities
    getJobData: useCallback((jobId: string) => state.payeeDataMap[jobId], [state.payeeDataMap]),
    isProcessing: useCallback((jobId: string) => state.processing.has(jobId), [state.processing]),
    getError: useCallback((jobId: string) => state.errors[jobId], [state.errors])
  };
};

// Export the event emitter function for external use
export { emitBatchJobUpdate };
