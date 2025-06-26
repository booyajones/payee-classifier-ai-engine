
import { supabase } from '@/integrations/supabase/client';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { backgroundBatchService } from './backgroundBatchService';

export interface DatabaseBatchJob {
  id: string;
  status: string;
  created_at_timestamp: number;
  in_progress_at_timestamp?: number;
  finalizing_at_timestamp?: number;
  completed_at_timestamp?: number;
  failed_at_timestamp?: number;
  expired_at_timestamp?: number;
  cancelled_at_timestamp?: number;
  request_counts_total: number;
  request_counts_completed: number;
  request_counts_failed: number;
  metadata?: any;
  errors?: any;
  output_file_id?: string;
  unique_payee_names: string[];
  original_file_data: any;
  row_mappings: any;
  file_name?: string;
  file_headers?: string[];
  selected_payee_column?: string;
  app_created_at: string;
  app_updated_at: string;
  updated_at?: string;
}

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
    await saveMinimalBatchJobRecord(batchJob, payeeRowData);
    
    return {
      immediate: true,
      backgroundPromise
    };
  } else {
    console.log(`[DB BATCH SERVICE] Using direct save for smaller file`);
    
    // Direct save for smaller files
    await performDirectSave(batchJob, payeeRowData);
    
    return { immediate: true };
  }
};

/**
 * Save minimal record immediately for user feedback
 */
const saveMinimalBatchJobRecord = async (
  batchJob: BatchJob,
  payeeRowData: PayeeRowData
) => {
  const minimalRecord = {
    id: batchJob.id,
    status: batchJob.status,
    created_at_timestamp: batchJob.created_at,
    request_counts_total: batchJob.request_counts.total,
    request_counts_completed: batchJob.request_counts.completed,
    request_counts_failed: batchJob.request_counts.failed,
    unique_payee_names: payeeRowData.uniquePayeeNames.slice(0, 100), // First 100 for immediate display
    original_file_data: [{ preview: true, total_rows: payeeRowData.originalFileData.length }],
    row_mappings: [{ preview: true, total_mappings: payeeRowData.rowMappings.length }],
    metadata: JSON.parse(JSON.stringify({
      preview_mode: true,
      full_data_loading: true,
      total_payees: payeeRowData.uniquePayeeNames.length,
      total_rows: payeeRowData.originalFileData.length
    })),
    file_name: (payeeRowData as any).fileName || null,
    errors: null,
    output_file_id: null,
    in_progress_at_timestamp: null,
    finalizing_at_timestamp: null,
    completed_at_timestamp: null,
    failed_at_timestamp: null,
    expired_at_timestamp: null,
    cancelled_at_timestamp: null,
    file_headers: (payeeRowData as any).fileHeaders || null,
    selected_payee_column: (payeeRowData as any).selectedPayeeColumn || null,
  };

  const { error } = await supabase
    .from('batch_jobs')
    .upsert(minimalRecord, {
      onConflict: 'id',
      ignoreDuplicates: false
    });

  if (error) {
    console.error('[DB BATCH SERVICE] Minimal record save failed:', error);
    throw new Error(`Minimal record save failed: ${error.message}`);
  }

  console.log(`[DB BATCH SERVICE] Minimal record saved for immediate user feedback: ${batchJob.id}`);
};

/**
 * Perform direct save for smaller files
 */
const performDirectSave = async (
  batchJob: BatchJob,
  payeeRowData: PayeeRowData
) => {
  const dbRecord = {
    id: batchJob.id,
    status: batchJob.status,
    created_at_timestamp: batchJob.created_at,
    in_progress_at_timestamp: batchJob.in_progress_at || null,
    finalizing_at_timestamp: batchJob.finalizing_at || null,
    completed_at_timestamp: batchJob.completed_at || null,
    failed_at_timestamp: batchJob.failed_at || null,
    expired_at_timestamp: batchJob.expired_at || null,
    cancelled_at_timestamp: batchJob.cancelled_at || null,
    request_counts_total: batchJob.request_counts.total,
    request_counts_completed: batchJob.request_counts.completed,
    request_counts_failed: batchJob.request_counts.failed,
    metadata: JSON.parse(JSON.stringify({
      ...(batchJob.metadata || {}),
      direct_save: true,
      save_time: new Date().toISOString()
    })),
    errors: batchJob.errors ? JSON.parse(JSON.stringify(batchJob.errors)) : null,
    output_file_id: batchJob.output_file_id || null,
    unique_payee_names: payeeRowData.uniquePayeeNames,
    original_file_data: JSON.parse(JSON.stringify(payeeRowData.originalFileData)),
    row_mappings: JSON.parse(JSON.stringify(payeeRowData.rowMappings)),
    file_name: (payeeRowData as any).fileName || null,
    file_headers: (payeeRowData as any).fileHeaders || null,
    selected_payee_column: (payeeRowData as any).selectedPayeeColumn || null,
  };

  const { error } = await supabase
    .from('batch_jobs')
    .upsert(dbRecord, {
      onConflict: 'id',
      ignoreDuplicates: false
    });

  if (error) {
    throw new Error(`Direct save failed: ${error.message}`);
  }

  console.log(`[DB BATCH SERVICE] Direct save completed for job ${batchJob.id}`);
};

/**
 * Update batch job status with retry logic
 */
export const updateBatchJobStatus = async (
  batchJob: BatchJob
): Promise<void> => {
  console.log(`[DB BATCH SERVICE] Updating batch job ${batchJob.id} status to ${batchJob.status}`);

  const updateData = {
    status: batchJob.status,
    in_progress_at_timestamp: batchJob.in_progress_at || null,
    finalizing_at_timestamp: batchJob.finalizing_at || null,
    completed_at_timestamp: batchJob.completed_at || null,
    failed_at_timestamp: batchJob.failed_at || null,
    expired_at_timestamp: batchJob.expired_at || null,
    cancelled_at_timestamp: batchJob.cancelled_at || null,
    request_counts_total: batchJob.request_counts.total,
    request_counts_completed: batchJob.request_counts.completed,
    request_counts_failed: batchJob.request_counts.failed,
    metadata: batchJob.metadata ? JSON.parse(JSON.stringify(batchJob.metadata)) : null,
    errors: batchJob.errors ? JSON.parse(JSON.stringify(batchJob.errors)) : null,
    output_file_id: batchJob.output_file_id || null,
  };

  let lastError: Error | null = null;
  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { error } = await supabase
        .from('batch_jobs')
        .update(updateData)
        .eq('id', batchJob.id);

      if (error) {
        throw new Error(`Status update failed: ${error.message}`);
      }
      
      console.log(`[DB BATCH SERVICE] Successfully updated batch job ${batchJob.id} status to ${batchJob.status}`);
      return;
      
    } catch (error) {
      lastError = error as Error;
      console.warn(`[DB BATCH SERVICE] Status update attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Status update failed after ${maxRetries} attempts: ${lastError?.message}`);
};

/**
 * Load all batch jobs with enhanced error handling
 */
export const loadAllBatchJobs = async (): Promise<{
  jobs: BatchJob[];
  payeeRowDataMap: Record<string, PayeeRowData>;
}> => {
  console.log('[DB BATCH SERVICE] Loading all batch jobs with enhanced validation');

  const { data, error } = await supabase
    .from('batch_jobs')
    .select('*')
    .order('app_created_at', { ascending: false });

  if (error) {
    console.error('[DB BATCH SERVICE] Error loading batch jobs:', error);
    throw new Error(`Failed to load batch jobs: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.log('[DB BATCH SERVICE] No batch jobs found');
    return { jobs: [], payeeRowDataMap: {} };
  }

  console.log(`[DB BATCH SERVICE] Processing ${data.length} batch jobs`);

  const jobs: BatchJob[] = [];
  const payeeRowDataMap: Record<string, PayeeRowData> = {};

  data.forEach((record, index) => {
    try {
      console.log(`[DB BATCH SERVICE] Processing job ${index + 1}/${data.length}: ${record.id}`);
      
      const batchJob: BatchJob = {
        id: record.id,
        errors: record.errors || null,
        input_file_id: 'db-stored',
        completion_window: '24h',
        status: record.status as any,
        output_file_id: record.output_file_id || null,
        created_at: record.created_at_timestamp,
        in_progress_at: record.in_progress_at_timestamp || null,
        expired_at: record.expired_at_timestamp || null,
        finalizing_at: record.finalizing_at_timestamp || null,
        completed_at: record.completed_at_timestamp || null,
        failed_at: record.failed_at_timestamp || null,
        cancelled_at: record.cancelled_at_timestamp || null,
        request_counts: {
          total: record.request_counts_total,
          completed: record.request_counts_completed,
          failed: record.request_counts_failed
        },
        metadata: record.metadata as any || null
      };

      // Handle data with improved validation
      const originalFileData = Array.isArray(record.original_file_data) ? record.original_file_data : [];
      const rowMappings = Array.isArray(record.row_mappings) ? record.row_mappings : [];
      const uniquePayeeNames = Array.isArray(record.unique_payee_names) ? record.unique_payee_names : [];

      // Check for preview mode or background loading
      const metadata = record.metadata as any;
      const isPreview = metadata && metadata.preview_mode;
      const isBackgroundLoading = metadata && metadata.full_data_loading;

      if (isPreview || isBackgroundLoading) {
        console.log(`[DB BATCH SERVICE] Job ${record.id} is in preview/background loading mode`);
      }

      const payeeRowData: PayeeRowData = {
        uniquePayeeNames,
        originalFileData,
        rowMappings: rowMappings as any[],
        ...(record.file_name && { fileName: record.file_name }),
        ...(record.file_headers && { fileHeaders: record.file_headers }),
        ...(record.selected_payee_column && { selectedPayeeColumn: record.selected_payee_column }),
      };

      jobs.push(batchJob);
      payeeRowDataMap[record.id] = payeeRowData;
      
      console.log(`[DB BATCH SERVICE] Successfully processed job ${record.id} with ${uniquePayeeNames.length} payees`);
    } catch (error) {
      console.error(`[DB BATCH SERVICE] Error processing job ${record.id}:`, error);
    }
  });

  console.log(`[DB BATCH SERVICE] Successfully loaded ${jobs.length} batch jobs with enhanced processing`);
  return { jobs, payeeRowDataMap };
};

/**
 * Delete batch job
 */
export const deleteBatchJob = async (jobId: string): Promise<void> => {
  console.log(`[DB BATCH SERVICE] Deleting batch job ${jobId}`);

  const { error } = await supabase
    .from('batch_jobs')
    .delete()
    .eq('id', jobId);

  if (error) {
    console.error('[DB BATCH SERVICE] Error deleting batch job:', error);
    throw new Error(`Failed to delete batch job: ${error.message}`);
  }

  console.log(`[DB BATCH SERVICE] Successfully deleted batch job ${jobId}`);
};

/**
 * Get batch job count
 */
export const getBatchJobCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('batch_jobs')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('[DB BATCH SERVICE] Error getting batch job count:', error);
    return 0;
  }

  return count || 0;
};

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
