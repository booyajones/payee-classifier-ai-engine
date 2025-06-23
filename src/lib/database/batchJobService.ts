
import { supabase } from '@/integrations/supabase/client';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';

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
 * Save batch job to database with enhanced error handling and validation
 */
export const saveBatchJob = async (
  batchJob: BatchJob,
  payeeRowData: PayeeRowData
): Promise<void> => {
  console.log(`[DB BATCH SERVICE] Saving batch job ${batchJob.id} to database with enhanced validation`);

  // Validate required data before saving
  if (!batchJob.id || !payeeRowData.uniquePayeeNames || !payeeRowData.originalFileData) {
    throw new Error('Missing required batch job data for database persistence');
  }

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
    metadata: batchJob.metadata || null,
    errors: batchJob.errors || null,
    output_file_id: batchJob.output_file_id || null,
    unique_payee_names: payeeRowData.uniquePayeeNames,
    original_file_data: payeeRowData.originalFileData,
    row_mappings: payeeRowData.rowMappings,
    file_name: (payeeRowData as any).fileName || null,
    file_headers: (payeeRowData as any).fileHeaders || null,
    selected_payee_column: (payeeRowData as any).selectedPayeeColumn || null,
  };

  console.log(`[DB BATCH SERVICE] Saving job data:`, {
    jobId: batchJob.id,
    status: batchJob.status,
    payeeCount: payeeRowData.uniquePayeeNames.length,
    originalDataCount: payeeRowData.originalFileData.length
  });

  const { error } = await supabase
    .from('batch_jobs')
    .upsert(dbRecord, {
      onConflict: 'id',
      ignoreDuplicates: false
    });

  if (error) {
    console.error('[DB BATCH SERVICE] Error saving batch job:', error);
    throw new Error(`Failed to save batch job to database: ${error.message}`);
  }

  console.log(`[DB BATCH SERVICE] Successfully saved batch job ${batchJob.id} to database`);
};

/**
 * Update batch job status in database with enhanced logging
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
    metadata: batchJob.metadata || null,
    errors: batchJob.errors || null,
    output_file_id: batchJob.output_file_id || null,
  };

  const { error } = await supabase
    .from('batch_jobs')
    .update(updateData)
    .eq('id', batchJob.id);

  if (error) {
    console.error('[DB BATCH SERVICE] Error updating batch job status:', error);
    throw new Error(`Failed to update batch job status in database: ${error.message}`);
  }

  console.log(`[DB BATCH SERVICE] Successfully updated batch job ${batchJob.id} status to ${batchJob.status}`);
};

/**
 * Load all batch jobs from database with enhanced error handling
 */
export const loadAllBatchJobs = async (): Promise<{
  jobs: BatchJob[];
  payeeRowDataMap: Record<string, PayeeRowData>;
}> => {
  console.log('[DB BATCH SERVICE] Loading all batch jobs from database with enhanced validation');

  const { data, error } = await supabase
    .from('batch_jobs')
    .select('*')
    .order('app_created_at', { ascending: false });

  if (error) {
    console.error('[DB BATCH SERVICE] Error loading batch jobs from database:', error);
    throw new Error(`Failed to load batch jobs from database: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.log('[DB BATCH SERVICE] No batch jobs found in database');
    return { jobs: [], payeeRowDataMap: {} };
  }

  console.log(`[DB BATCH SERVICE] Loaded ${data.length} batch jobs from database, processing...`);

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

      // Enhanced validation for PayeeRowData
      const originalFileData = Array.isArray(record.original_file_data) ? record.original_file_data : [];
      const rowMappings = Array.isArray(record.row_mappings) ? record.row_mappings : [];
      const uniquePayeeNames = Array.isArray(record.unique_payee_names) ? record.unique_payee_names : [];

      if (originalFileData.length === 0) {
        console.warn(`[DB BATCH SERVICE] Job ${record.id} has no original file data`);
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
      // Continue processing other jobs even if one fails
    }
  });

  console.log(`[DB BATCH SERVICE] Successfully loaded ${jobs.length} batch jobs from database`);
  return { jobs, payeeRowDataMap };
};

/**
 * Delete batch job from database
 */
export const deleteBatchJob = async (jobId: string): Promise<void> => {
  console.log(`[DB BATCH SERVICE] Deleting batch job ${jobId} from database`);

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
