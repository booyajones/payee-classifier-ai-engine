// Refactored Batch Job Manager using Zustand store
import React from 'react';
import { useBatchJobStore } from '@/stores/batchJobStore';
import { useAppStore } from '@/stores/appStore';
import { useProgressStore } from '@/stores/progressStore';
import { databaseService } from '@/lib/database/consolidatedDatabaseService';
import { logger } from '@/lib/logging';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';

interface BatchManagerProps {
  onJobSelect?: (jobId: string) => void;
  onJobComplete?: (jobId: string) => void;
}

export const useBatchManager = () => {
  const batchStore = useBatchJobStore();
  const { setError, clearError } = useAppStore();
  const progressStore = useProgressStore();

  // Load jobs from database
  const loadJobs = React.useCallback(async () => {
    try {
      batchStore.setLoaded(false);
      clearError();
      
      logger.info('Loading batch jobs from database', null, 'BATCH_MANAGER');
      
      const { jobs, payeeDataMap } = await databaseService.loadBatchJobs();
      
      batchStore.setJobs(jobs);
      batchStore.setPayeeDataMap(payeeDataMap);
      batchStore.setLoaded(true);
      
      logger.info(`Loaded ${jobs.length} batch jobs successfully`, 
        { count: jobs.length }, 'BATCH_MANAGER');
    } catch (error) {
      logger.error('Failed to load batch jobs', error, 'BATCH_MANAGER');
      setError('Failed to load batch jobs');
      batchStore.setLoaded(true);
    }
  }, [batchStore, setError, clearError]);

  // Save new job
  const saveJob = React.useCallback(async (job: BatchJob, payeeData: PayeeRowData) => {
    try {
      batchStore.setProcessing(job.id, true);
      clearError();
      
      logger.info(`Saving batch job ${job.id}`, { jobId: job.id }, 'BATCH_MANAGER');
      
      await databaseService.saveBatchJob(job, payeeData);
      
      batchStore.addJob(job);
      batchStore.setPayeeData(job.id, payeeData);
      batchStore.setProcessing(job.id, false);
      
      logger.info(`Saved batch job ${job.id} successfully`, { jobId: job.id }, 'BATCH_MANAGER');
    } catch (error) {
      logger.error(`Failed to save batch job ${job.id}`, error, 'BATCH_MANAGER');
      batchStore.setError(job.id, 'Failed to save job');
      batchStore.setProcessing(job.id, false);
      throw error;
    }
  }, [batchStore, clearError]);

  // Delete job
  const deleteJob = React.useCallback(async (jobId: string) => {
    try {
      batchStore.setProcessing(jobId, true);
      clearError();
      
      logger.info(`Deleting batch job ${jobId}`, { jobId }, 'BATCH_MANAGER');
      
      await databaseService.deleteBatchJob(jobId);
      
      batchStore.removeJob(jobId);
      progressStore.clearProgress(jobId);
      
      logger.info(`Deleted batch job ${jobId} successfully`, { jobId }, 'BATCH_MANAGER');
    } catch (error) {
      logger.error(`Failed to delete batch job ${jobId}`, error, 'BATCH_MANAGER');
      batchStore.setError(jobId, 'Failed to delete job');
      batchStore.setProcessing(jobId, false);
      throw error;
    }
  }, [batchStore, progressStore, clearError]);

  // Update job status
  const updateJobStatus = React.useCallback((job: BatchJob) => {
    logger.debug(`Updating job ${job.id} status to ${job.status}`, 
      { jobId: job.id, status: job.status }, 'BATCH_MANAGER');
    
    batchStore.updateJob(job);
    batchStore.clearError(job.id);
  }, [batchStore]);

  // Initialize jobs on mount
  React.useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  return {
    // State
    jobs: batchStore.jobs,
    payeeDataMap: batchStore.payeeDataMap,
    payeeRowDataMap: batchStore.payeeDataMap, // Alias for backward compatibility
    isLoaded: batchStore.isLoaded,
    selectedJobId: batchStore.selectedJobId,
    
    // Actions
    loadJobs,
    saveJob,
    createBatch: saveJob, // Alias for backward compatibility
    deleteJob,
    updateJob: updateJobStatus, // Add missing updateJob
    updateJobStatus,
    
    // Utilities
    getJob: batchStore.getJob,
    getPayeeData: batchStore.getPayeeData,
    isProcessing: batchStore.isProcessing,
    hasError: batchStore.hasError,
    getError: batchStore.getError,
    setSelectedJobId: batchStore.setSelectedJobId
  };
};

// Export event emitter for backward compatibility
export const emitBatchJobUpdate = (job: BatchJob) => {
  logger.debug(`Batch job update emitted for ${job.id}`, { jobId: job.id, status: job.status }, 'BATCH_MANAGER');
};