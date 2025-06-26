
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { backgroundBatchService } from './backgroundBatchService';
import { BatchJobDatabaseOperations } from './batchJobDatabaseOperations';
import { BatchJobLoader } from './batchJobLoader';
import { BatchJobUpdater } from './batchJobUpdater';

// Re-export types and interfaces
export type { DatabaseBatchJob } from './batchJobLoader';

/**
 * Enhanced batch job save with background processing and immediate user feedback
 */
export const saveBatchJob = async (
  batchJob: BatchJob,
  payeeRowData: PayeeRowData,
  options: { background?: boolean } = { background: true }
): Promise<{ immediate: boolean; backgroundPromise?: Promise<any> }> => {
  console.log(`[DB BATCH SERVICE] Saving batch job ${batchJob.id} with enhanced background processing`);

  // Validate required data
  if (!batchJob.id || !payeeRowData.uniquePayeeNames || !payeeRowData.originalFileData) {
    throw new Error('Missing required batch job data for database persistence');
  }

  const payeeCount = payeeRowData.uniquePayeeNames.length;
  const originalDataCount = payeeRowData.originalFileData.length;
  
  console.log(`[DB BATCH SERVICE] Processing job with ${payeeCount} payees and ${originalDataCount} rows`);

  // Determine save strategy
  const isLargeFile = originalDataCount > 10000 || payeeCount > 2000;
  const shouldUseBackground = options.background && isLargeFile;

  if (shouldUseBackground) {
    console.log(`[DB BATCH SERVICE] Using background save for large file (${originalDataCount} rows)`);
    
    // Queue background save
    const backgroundPromise = backgroundBatchService.queueBatchJobSave(batchJob, payeeRowData);
    
    // Save minimal record immediately for user feedback
    await BatchJobDatabaseOperations.saveMinimalBatchJobRecord(batchJob, payeeRowData);
    
    return {
      immediate: true,
      backgroundPromise
    };
  } else {
    console.log(`[DB BATCH SERVICE] Using direct save for smaller file`);
    
    // Direct save for smaller files
    await BatchJobDatabaseOperations.performDirectSave(batchJob, payeeRowData);
    
    return { immediate: true };
  }
};

/**
 * Update batch job status with retry logic
 */
export const updateBatchJobStatus = BatchJobUpdater.updateBatchJobStatus;

/**
 * Load all batch jobs with enhanced error handling
 */
export const loadAllBatchJobs = BatchJobLoader.loadAllBatchJobs;

/**
 * Delete batch job
 */
export const deleteBatchJob = BatchJobDatabaseOperations.deleteBatchJob;

/**
 * Get batch job count
 */
export const getBatchJobCount = BatchJobDatabaseOperations.getBatchJobCount;

/**
 * Check background save status
 */
export const checkBackgroundSaveStatus = async (jobId: string): Promise<{
  isComplete: boolean;
  error?: string;
}> => {
  const result = await backgroundBatchService.getSaveStatus(jobId);
  
  if (!result) {
    return { isComplete: true }; // Not in background queue, assume complete
  }
  
  return {
    isComplete: result.success,
    error: result.error
  };
};
