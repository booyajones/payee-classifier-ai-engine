// Updated batch job service using consolidated database service
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { databaseService } from './consolidatedDatabaseService';
import { logger } from '@/lib/logging';

/**
 * Enhanced batch job save with consolidated database operations
 */
export const saveBatchJob = async (
  batchJob: BatchJob,
  payeeRowData: PayeeRowData
): Promise<void> => {
  logger.info(`Saving batch job ${batchJob.id} with consolidated service`, 
    { jobId: batchJob.id, payeeCount: payeeRowData.uniquePayeeNames.length }, 'BATCH_SERVICE');

  // Validate required data
  if (!batchJob.id || !payeeRowData.uniquePayeeNames || !payeeRowData.originalFileData) {
    throw new Error('Missing required batch job data for database persistence');
  }

  return databaseService.saveBatchJob(batchJob, payeeRowData);
};

/**
 * Load all batch jobs using consolidated service
 */
export const loadAllBatchJobs = async () => {
  logger.info('Loading all batch jobs with consolidated service', null, 'BATCH_SERVICE');
  return databaseService.loadBatchJobs();
};

/**
 * Delete batch job using consolidated service
 */
export const deleteBatchJob = async (jobId: string): Promise<void> => {
  logger.info(`Deleting batch job ${jobId}`, { jobId }, 'BATCH_SERVICE');
  return databaseService.deleteBatchJob(jobId);
};

/**
 * Health check using consolidated service
 */
export const checkDatabaseHealth = async (): Promise<boolean> => {
  return databaseService.healthCheck();
};

/**
 * Update batch job status (for backward compatibility)
 */
export const updateBatchJobStatus = async (job: BatchJob): Promise<void> => {
  logger.info(`Updating batch job status ${job.id} to ${job.status}`, 
    { jobId: job.id, status: job.status }, 'BATCH_SERVICE');
  // For now, this is handled by saveJob - could be extended if needed
};

/**
 * Check background save status (for backward compatibility)
 */
export const checkBackgroundSaveStatus = async (jobId: string): Promise<{
  isComplete: boolean;
  error?: string;
}> => {
  // For simplified implementation, assume all operations are synchronous now
  return { isComplete: true };
};