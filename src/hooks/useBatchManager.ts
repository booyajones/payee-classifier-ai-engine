
import { useCallback, useEffect, useRef } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { useBatchJobState } from './batch/useBatchJobState';
import { useBatchJobActions } from './batch/useBatchJobActions';
import { useBatchJobLoader } from './batch/useBatchJobLoader';
import { useBatchJobEventListener, emitBatchJobUpdate } from './batch/useBatchJobEventEmitter';
import { createBatchJob } from '@/lib/openai/trueBatchAPI';
import { deleteBatchJob, saveBatchJob } from '@/lib/database/batchJobService';
import { useToast } from '@/hooks/use-toast';
import { handleError, showErrorToast, ERROR_CODES, BatchProcessingError } from '@/lib/errorHandler';

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
    setError,
    clearError
  } = useBatchJobState();

  const { refreshJobs } = useBatchJobLoader(updateJobs, updatePayeeDataMap, setLoaded);

  // Use refs to prevent multiple simultaneous operations
  const refreshInProgress = useRef<Set<string>>(new Set());
  const eventListenerActive = useRef(false);
  const jobCreationInProgress = useRef<Set<string>>(new Set());

  // Enhanced error detection for OpenAI API issues
  const detectOpenAIError = (error: unknown): { code: string; message: string; retryable: boolean } => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = errorMessage.toLowerCase();

    console.log(`[BATCH MANAGER] Analyzing error: ${errorMessage}`);

    if (lowerMessage.includes('quota') || lowerMessage.includes('rate limit') || lowerMessage.includes('usage limit')) {
      return {
        code: ERROR_CODES.API_QUOTA_EXCEEDED,
        message: 'OpenAI API quota exceeded. Please check your usage limits and try again later.',
        retryable: true
      };
    }

    if (lowerMessage.includes('401') || lowerMessage.includes('unauthorized') || lowerMessage.includes('api key')) {
      return {
        code: ERROR_CODES.API_AUTHENTICATION_FAILED,
        message: 'OpenAI API authentication failed. Please check your API key in the settings.',
        retryable: false
      };
    }

    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
      return {
        code: ERROR_CODES.API_TIMEOUT,
        message: 'Request to OpenAI API timed out. Please try again.',
        retryable: true
      };
    }

    if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('connection')) {
      return {
        code: ERROR_CODES.NETWORK_ERROR,
        message: 'Network error occurred while connecting to OpenAI. Please check your connection.',
        retryable: true
      };
    }

    if (lowerMessage.includes('server error') || lowerMessage.includes('500') || lowerMessage.includes('503')) {
      return {
        code: ERROR_CODES.SERVER_ERROR,
        message: 'OpenAI API server error. Please try again in a few minutes.',
        retryable: true
      };
    }

    return {
      code: 'OPENAI_UNKNOWN_ERROR',
      message: `OpenAI API error: ${errorMessage}`,
      retryable: false
    };
  };

  // Listen for job updates from other components with improved handling
  useEffect(() => {
    const handleJobUpdate = async () => {
      if (eventListenerActive.current) {
        console.log('[BATCH MANAGER] Event handler already active, skipping...');
        return;
      }

      eventListenerActive.current = true;
      
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log('[BATCH MANAGER] Received job update event, refreshing jobs...');
        await refreshJobs(true);
      } catch (error) {
        console.error('[BATCH MANAGER] Error during event-triggered refresh:', error);
        const appError = handleError(error, 'Event-triggered refresh');
        setError('refresh', appError.message);
      } finally {
        eventListenerActive.current = false;
      }
    };

    const unsubscribe = useBatchJobEventListener(handleJobUpdate);
    return unsubscribe;
  }, [refreshJobs, setError]);

  // Enhanced batch creation with comprehensive error handling
  const createBatch = useCallback(async (
    payeeRowData: PayeeRowData,
    options: BatchCreationOptions = {}
  ): Promise<BatchJob | null> => {
    const jobKey = `${Date.now()}-${Math.random()}`;
    
    if (jobCreationInProgress.current.has(jobKey)) {
      console.log('[BATCH MANAGER] Job creation already in progress for this request');
      return null;
    }

    jobCreationInProgress.current.add(jobKey);

    try {
      console.log(`[BATCH MANAGER] Creating batch job for ${payeeRowData.uniquePayeeNames.length} payees`);
      
      // Validate input data
      if (!payeeRowData.uniquePayeeNames || payeeRowData.uniquePayeeNames.length === 0) {
        throw new BatchProcessingError(
          ERROR_CODES.NO_VALID_PAYEES,
          'No valid payee names found in the uploaded file'
        );
      }

      if (payeeRowData.uniquePayeeNames.length > 50000) {
        toast({
          title: "Large File Detected",
          description: `Processing ${payeeRowData.uniquePayeeNames.length} payees. This may take several minutes.`,
        });
      }

      // Clear any previous errors
      clearError('create');

      // Create the OpenAI batch job
      console.log('[BATCH MANAGER] Calling OpenAI API to create batch job...');
      const job = await createBatchJob(
        payeeRowData.uniquePayeeNames, 
        options.description || 'Batch Classification Job'
      );
      
      if (!job) {
        throw new BatchProcessingError(
          ERROR_CODES.BATCH_CREATION_FAILED,
          'Failed to create batch job - no job returned from OpenAI API'
        );
      }

      console.log(`[BATCH MANAGER] OpenAI batch job created successfully: ${job.id}`);

      // Add to local state immediately for responsive UI
      addJob(job, payeeRowData);

      // Attempt to save to database (non-blocking for user experience)
      try {
        console.log(`[BATCH MANAGER] Saving job ${job.id} to database...`);
        const saveResult = await saveBatchJob(job, payeeRowData, { background: true });
        
        if (saveResult.immediate) {
          console.log(`[BATCH MANAGER] Job ${job.id} saved to database successfully`);
          toast({
            title: "Batch Job Created",
            description: `Job ${job.id.substring(0, 8)}... created and saved successfully`,
          });
        } else {
          console.log(`[BATCH MANAGER] Job ${job.id} queued for background save`);
          toast({
            title: "Batch Job Created",
            description: `Job ${job.id.substring(0, 8)}... created. Data optimization in progress...`,
          });
        }

      } catch (dbError) {
        console.error(`[BATCH MANAGER] Database save failed for job ${job.id}:`, dbError);
        toast({
          title: "Database Warning",
          description: "Job created successfully but database save failed. Job may not persist on refresh.",
          variant: "destructive"
        });
        // Don't throw - the OpenAI job was created successfully
      }

      // Call the onJobUpdate callback if provided
      if (options.onJobUpdate) {
        try {
          options.onJobUpdate(job);
        } catch (callbackError) {
          console.error('[BATCH MANAGER] Error in onJobUpdate callback:', callbackError);
        }
      }
      
      // Emit batch job update to refresh UI
      emitBatchJobUpdate();
      
      return job;

    } catch (error) {
      console.error('[BATCH MANAGER] Failed to create batch job:', error);
      
      // Detect and handle specific OpenAI API errors
      const { code, message, retryable } = detectOpenAIError(error);
      
      const appError = new BatchProcessingError(code, message, undefined, retryable, 'Batch Creation');
      
      if (!options.silent) {
        setError('create', appError.message);
        showErrorToast(appError, 'Batch Creation');
      }
      
      return null;

    } finally {
      jobCreationInProgress.current.delete(jobKey);
    }
  }, [addJob, setError, clearError, toast]);

  // Enhanced delete job function with proper error handling
  const deleteJob = useCallback(async (jobId: string) => {
    try {
      console.log(`[BATCH MANAGER] Deleting job ${jobId} from database and local state`);
      
      // Clear any previous errors for this job
      clearError(jobId);
      
      // Delete from database first
      await deleteBatchJob(jobId);
      console.log(`[BATCH MANAGER] Successfully deleted job ${jobId} from database`);
      
      // Remove from local state
      removeJob(jobId);
      
      // Emit update to refresh UI
      emitBatchJobUpdate();
      
      // Show success toast
      toast({
        title: "Job Deleted",
        description: "Batch job has been successfully removed.",
      });
      
    } catch (error) {
      console.error(`[BATCH MANAGER] Error deleting job ${jobId}:`, error);
      
      const appError = handleError(error, 'Job Deletion');
      setError(jobId, appError.message);
      
      // Show error toast
      toast({
        title: "Delete Failed",
        description: `Failed to delete batch job: ${appError.message}`,
        variant: "destructive",
      });
    }
  }, [removeJob, clearError, setError, toast]);

  // Update job function with error handling
  const updateJobInManager = useCallback((job: BatchJob) => {
    try {
      console.log(`[BATCH MANAGER] Updating job ${job.id} with status: ${job.status}`);
      updateJob(job);
      clearError(job.id); // Clear any previous errors when job updates successfully
      emitBatchJobUpdate();
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
    refreshJobs: useCallback(async (silent = false) => {
      const refreshKey = 'global';
      if (refreshInProgress.current.has(refreshKey)) {
        console.log('[BATCH MANAGER] Global refresh already in progress, skipping...');
        return;
      }
      
      try {
        refreshInProgress.current.add(refreshKey);
        clearError('refresh');
        await refreshJobs(silent);
      } catch (error) {
        console.error('[BATCH MANAGER] Error during refresh:', error);
        const appError = handleError(error, 'Refresh Jobs');
        setError('refresh', appError.message);
        if (!silent) {
          showErrorToast(appError, 'Refresh Jobs');
        }
      } finally {
        refreshInProgress.current.delete(refreshKey);
      }
    }, [refreshJobs, clearError, setError]),
    
    // Enhanced batch operations
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
export { emitBatchJobUpdate };
