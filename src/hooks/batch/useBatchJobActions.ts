
import { useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { batchCreationService } from '@/lib/services/batchCreationService';
import { saveBatchJob, updateBatchJobStatus, deleteBatchJob } from '@/lib/database/batchJobService';
import { emitBatchJobUpdate } from './useBatchJobEventEmitter';

interface BatchCreationOptions {
  description?: string;
  onJobUpdate?: (job: BatchJob) => void;
  onJobComplete?: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
  silent?: boolean;
}

export const useBatchJobActions = (
  addJob: (job: BatchJob, payeeRowData: PayeeRowData) => void,
  updateJob: (job: BatchJob) => void,
  removeJob: (jobId: string) => void,
  clearAllJobs: () => void,
  setError: (jobId: string, error: string) => void
) => {
  const { toast } = useToast();

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
        // Still emit update event for local processing completion
        emitBatchJobUpdate();
        return null;
      }

      // Save to database first
      await saveBatchJob(job, payeeRowData);
      
      // Update state immediately with functional update to ensure consistency
      addJob(job, payeeRowData);
      
      // Emit update event to notify other components
      console.log(`[BATCH MANAGER] Job ${job.id} successfully added, emitting update event`);
      emitBatchJobUpdate();
      
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
  }, [toast, addJob]);

  const updateJobStatus = useCallback(async (updatedJob: BatchJob, silent: boolean = true) => {
    try {
      await updateBatchJobStatus(updatedJob);
      updateJob(updatedJob);
      console.log(`[BATCH MANAGER] Job ${updatedJob.id} updated in state`);
      
      // Emit update event for job status changes
      emitBatchJobUpdate();
    } catch (error) {
      console.error('[BATCH MANAGER] Update failed:', error);
      setError(updatedJob.id, 'Failed to update job status');
    }
  }, [updateJob, setError]);

  const deleteJob = useCallback(async (jobId: string) => {
    try {
      await deleteBatchJob(jobId);
      removeJob(jobId);
      
      console.log(`[BATCH MANAGER] Job ${jobId} removed from state`);
      
      // Emit update event for job deletions
      emitBatchJobUpdate();
      
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
  }, [toast, removeJob]);

  const clearAll = useCallback(async (jobs: BatchJob[]) => {
    try {
      const deletePromises = jobs.map(job => deleteBatchJob(job.id));
      await Promise.all(deletePromises);
      
      clearAllJobs();
      
      // Emit update event for clearing all jobs
      emitBatchJobUpdate();
      
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
  }, [toast, clearAllJobs]);

  return {
    createBatch,
    updateJobStatus,
    deleteJob,
    clearAll
  };
};
