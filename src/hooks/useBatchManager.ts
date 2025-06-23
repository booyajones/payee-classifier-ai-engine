
import { useCallback, useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { batchCreationService } from '@/lib/services/batchCreationService';
import { saveBatchJob, updateBatchJobStatus, deleteBatchJob, loadAllBatchJobs } from '@/lib/database/batchJobService';

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
  silent?: boolean;
}

export const useBatchManager = () => {
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
        console.log('[BATCH MANAGER] Loading existing jobs from database...');
        const { jobs, payeeRowDataMap } = await loadAllBatchJobs();
        
        setState(prev => ({
          ...prev,
          jobs,
          payeeDataMap: payeeRowDataMap,
          isLoaded: true
        }));
        
        console.log(`[BATCH MANAGER] Loaded ${jobs.length} existing jobs`);
      } catch (error) {
        console.error('[BATCH MANAGER] Failed to load existing jobs:', error);
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
    
    console.log(`[BATCH MANAGER] Creating batch for ${payeeRowData.uniquePayeeNames.length} payees`);
    
    try {
      // Use the centralized batch creation service
      const job = await batchCreationService.createBatch(payeeRowData, {
        description,
        onJobComplete,
        silent
      });

      // If it's a local processing job (null), no state update needed
      if (!job) {
        return null;
      }

      // Save to database and update state
      await saveBatchJob(job, payeeRowData);
      
      setState(prev => ({
        ...prev,
        jobs: [...prev.jobs, job],
        payeeDataMap: { ...prev.payeeDataMap, [job.id]: payeeRowData }
      }));
      
      console.log(`[BATCH MANAGER] Job ${job.id} added to state. Total jobs: ${state.jobs.length + 1}`);
      
      return job;

    } catch (error) {
      console.error('[BATCH MANAGER] Creation failed:', error);
      
      if (!silent) {
        toast({
          title: "Batch Creation Failed",
          description: error instanceof Error ? error.message : 'Unknown error occurred',
          variant: "destructive"
        });
      }
      
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
      console.log(`[BATCH MANAGER] Job ${updatedJob.id} updated in state`);
    } catch (error) {
      console.error('[BATCH MANAGER] Update failed:', error);
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
      
      console.log(`[BATCH MANAGER] Job ${jobId} removed from state`);
      
      toast({
        title: "Job Deleted",
        description: `Job ${jobId.slice(-8)} removed successfully`,
      });
    } catch (error) {
      console.error('[BATCH MANAGER] Delete failed:', error);
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
      
      toast({
        title: "All Jobs Cleared",
        description: "All batch jobs have been removed",
      });
    } catch (error) {
      console.error('[BATCH MANAGER] Clear all failed:', error);
      toast({
        title: "Clear Error",
        description: "Some jobs could not be cleared",
        variant: "destructive"
      });
    }
  }, [state.jobs, toast]);

  const refreshJobs = useCallback(async (silent: boolean = true) => {
    try {
      console.log('[BATCH MANAGER] Refreshing jobs from database...');
      const { jobs, payeeRowDataMap } = await loadAllBatchJobs();
      
      setState(prev => ({
        ...prev,
        jobs,
        payeeDataMap: payeeRowDataMap
      }));
      
      console.log(`[BATCH MANAGER] Refreshed ${jobs.length} jobs`);
    } catch (error) {
      console.error('[BATCH MANAGER] Failed to refresh jobs:', error);
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
