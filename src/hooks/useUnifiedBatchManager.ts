import { useCallback, useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { BatchJob, createBatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { saveBatchJob, updateBatchJobStatus, deleteBatchJob, loadAllBatchJobs } from '@/lib/database/batchJobService';
import { batchProcessingService } from '@/lib/services/batchProcessingService';
import { DEFAULT_CLASSIFICATION_CONFIG } from '@/lib/classification/config';

interface BatchManagerState {
  jobs: BatchJob[];
  payeeDataMap: Record<string, PayeeRowData>;
  processing: Set<string>;
  errors: Record<string, string>;
  isLoaded: boolean;
}

interface BatchCreationOptions {
  description?: string;
  onJobUpdate?: (job: BatchJob) => void;
  onJobComplete?: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
  silent?: boolean; // Add option to suppress toasts
}

export const useUnifiedBatchManager = () => {
  const { toast } = useToast();
  const [state, setState] = useState<BatchManagerState>({
    jobs: [],
    payeeDataMap: {},
    processing: new Set(),
    errors: {},
    isLoaded: false
  });

  // Load existing jobs on mount
  useEffect(() => {
    const loadExistingJobs = async () => {
      try {
        console.log('[UNIFIED BATCH] Loading existing jobs from database...');
        const { jobs, payeeRowDataMap } = await loadAllBatchJobs();
        
        setState(prev => ({
          ...prev,
          jobs,
          payeeDataMap: payeeRowDataMap,
          isLoaded: true
        }));
        
        console.log(`[UNIFIED BATCH] Loaded ${jobs.length} existing jobs`);
      } catch (error) {
        console.error('[UNIFIED BATCH] Failed to load existing jobs:', error);
        setState(prev => ({ ...prev, isLoaded: true }));
      }
    };

    loadExistingJobs();
  }, []);

  const createBatch = useCallback(async (
    payeeRowData: PayeeRowData,
    options: BatchCreationOptions = {}
  ): Promise<BatchJob | null> => {
    const { description, onJobUpdate, onJobComplete, silent = false } = options;
    
    console.log(`[UNIFIED BATCH] Creating batch for ${payeeRowData.uniquePayeeNames.length} payees`);
    
    try {
      // Validate input - pass the complete PayeeRowData object
      batchProcessingService.validateBatchInput(payeeRowData);

      // For large files, use local processing
      if (payeeRowData.uniquePayeeNames.length > 45000) {
        console.log(`[UNIFIED BATCH] Large file detected, using local processing`);
        
        // Only show toast for large file processing (user needs to know this is different)
        if (!silent) {
          toast({
            title: "Large File Processing",
            description: "Processing large file locally with enhanced algorithms",
          });
        }

        const result = await batchProcessingService.processBatch(
          payeeRowData.uniquePayeeNames,
          {
            ...DEFAULT_CLASSIFICATION_CONFIG,
            offlineMode: true,
            aiThreshold: 75
          },
          payeeRowData.originalFileData
        );

        if (onJobComplete) {
          onJobComplete(result.results, result, 'local-processing');
        }

        return null;
      }

      // Create OpenAI batch job for smaller files
      const job = await createBatchJob(payeeRowData.uniquePayeeNames, description);
      await saveBatchJob(job, payeeRowData);
      
      // CRITICAL FIX: Update state immediately after job creation
      setState(prev => ({
        ...prev,
        jobs: [...prev.jobs, job],
        payeeDataMap: { ...prev.payeeDataMap, [job.id]: payeeRowData }
      }));
      
      console.log(`[UNIFIED BATCH] Job ${job.id} added to state. Total jobs: ${state.jobs.length + 1}`);
      
      // Remove toast for batch job creation - user can see it in the UI
      // Only show toast on errors or special cases

      return job;

    } catch (error) {
      console.error('[UNIFIED BATCH] Creation failed:', error);
      
      // Keep error toasts - users need to know about failures
      toast({
        title: "Batch Creation Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
      
      throw error;
    }
  }, [toast, state.jobs.length]);

  const updateJob = useCallback(async (updatedJob: BatchJob, silent: boolean = true) => {
    try {
      await updateBatchJobStatus(updatedJob);
      setState(prev => ({
        ...prev,
        jobs: prev.jobs.map(job => job.id === updatedJob.id ? updatedJob : job)
      }));
      console.log(`[UNIFIED BATCH] Job ${updatedJob.id} updated in state`);
      
      // Don't show toast for routine job updates - user can see status in UI
    } catch (error) {
      console.error('[UNIFIED BATCH] Update failed:', error);
      setState(prev => ({
        ...prev,
        errors: { ...prev.errors, [updatedJob.id]: 'Failed to update job status' }
      }));
    }
  }, []);

  const deleteJob = useCallback(async (jobId: string) => {
    try {
      await deleteBatchJob(jobId);
      setState(prev => ({
        ...prev,
        jobs: prev.jobs.filter(job => job.id !== jobId),
        payeeDataMap: Object.fromEntries(
          Object.entries(prev.payeeDataMap).filter(([id]) => id !== jobId)
        ),
        errors: Object.fromEntries(
          Object.entries(prev.errors).filter(([id]) => id !== jobId)
        )
      }));
      
      console.log(`[UNIFIED BATCH] Job ${jobId} removed from state`);
      
      // Keep toast for destructive actions - user needs confirmation
      toast({
        title: "Job Deleted",
        description: `Job ${jobId.slice(-8)} removed successfully`,
      });
    } catch (error) {
      console.error('[UNIFIED BATCH] Delete failed:', error);
      toast({
        title: "Delete Error",
        description: "Failed to delete job",
        variant: "destructive"
      });
    }
  }, [toast]);

  const clearAll = useCallback(async () => {
    try {
      const deletePromises = state.jobs.map(job => deleteBatchJob(job.id));
      await Promise.all(deletePromises);
      
      setState({
        jobs: [],
        payeeDataMap: {},
        processing: new Set(),
        errors: {},
        isLoaded: true
      });
      
      // Keep toast for bulk destructive actions - user needs confirmation
      toast({
        title: "All Jobs Cleared",
        description: "All batch jobs have been removed",
      });
    } catch (error) {
      console.error('[UNIFIED BATCH] Clear all failed:', error);
      toast({
        title: "Clear Error",
        description: "Some jobs could not be cleared",
        variant: "destructive"
      });
    }
  }, [state.jobs, toast]);

  const refreshJobs = useCallback(async (silent: boolean = true) => {
    try {
      console.log('[UNIFIED BATCH] Refreshing jobs from database...');
      const { jobs, payeeRowDataMap } = await loadAllBatchJobs();
      
      setState(prev => ({
        ...prev,
        jobs,
        payeeDataMap: payeeRowDataMap
      }));
      
      console.log(`[UNIFIED BATCH] Refreshed ${jobs.length} jobs`);
      
      // Don't show toast for routine refreshes
    } catch (error) {
      console.error('[UNIFIED BATCH] Failed to refresh jobs:', error);
    }
  }, []);

  return {
    // State
    jobs: state.jobs,
    payeeDataMap: state.payeeDataMap,
    processing: state.processing,
    errors: state.errors,
    isLoaded: state.isLoaded,
    
    // Actions
    createBatch,
    updateJob,
    deleteJob,
    clearAll,
    refreshJobs,
    
    // Utilities
    getJobData: useCallback((jobId: string) => state.payeeDataMap[jobId], [state.payeeDataMap]),
    isProcessing: useCallback((jobId: string) => state.processing.has(jobId), [state.processing]),
    getError: useCallback((jobId: string) => state.errors[jobId], [state.errors])
  };
};
