
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
 * Service for loading batch jobs from database
 */
export class BatchJobLoader {
  /**
   * Load all batch jobs with enhanced error handling
   */
  static async loadAllBatchJobs(): Promise<{
    jobs: BatchJob[];
    payeeRowDataMap: Record<string, PayeeRowData>;
  }> {
    console.log('[BATCH JOB LOADER] Loading all batch jobs with enhanced validation');

    const { data, error } = await supabase
      .from('batch_jobs')
      .select('*')
      .order('app_created_at', { ascending: false });

    if (error) {
      console.error('[BATCH JOB LOADER] Error loading batch jobs:', error);
      throw new Error(`Failed to load batch jobs: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.log('[BATCH JOB LOADER] No batch jobs found');
      return { jobs: [], payeeRowDataMap: {} };
    }

    console.log(`[BATCH JOB LOADER] Processing ${data.length} batch jobs`);

    const jobs: BatchJob[] = [];
    const payeeRowDataMap: Record<string, PayeeRowData> = {};

    data.forEach((record, index) => {
      try {
        console.log(`[BATCH JOB LOADER] Processing job ${index + 1}/${data.length}: ${record.id}`);
        
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
          console.log(`[BATCH JOB LOADER] Job ${record.id} is in preview/background loading mode`);
        }

        // Create PayeeRowData with all required properties
        const payeeRowData: PayeeRowData = {
          uniquePayeeNames,
          uniqueNormalizedNames: uniquePayeeNames, // Default to same as original names for legacy data
          originalFileData,
          rowMappings: rowMappings as any[],
          standardizationStats: {
            totalProcessed: uniquePayeeNames.length,
            changesDetected: 0,
            averageStepsPerName: 0,
            mostCommonSteps: []
          },
          ...(record.file_name && { fileName: record.file_name }),
          ...(record.file_headers && { fileHeaders: record.file_headers }),
          ...(record.selected_payee_column && { selectedPayeeColumn: record.selected_payee_column }),
        };

        jobs.push(batchJob);
        payeeRowDataMap[record.id] = payeeRowData;
        
        console.log(`[BATCH JOB LOADER] Successfully processed job ${record.id} with ${uniquePayeeNames.length} payees`);
      } catch (error) {
        console.error(`[BATCH JOB LOADER] Error processing job ${record.id}:`, error);
      }
    });

    console.log(`[BATCH JOB LOADER] Successfully loaded ${jobs.length} batch jobs with enhanced processing`);
    return { jobs, payeeRowDataMap };
  }

  /**
   * Load a single batch job by ID
   */
  static async loadBatchJobById(jobId: string): Promise<BatchJob | null> {
    console.log(`[BATCH JOB LOADER] Loading single job: ${jobId.substring(0, 8)}`);

    const { data, error } = await supabase
      .from('batch_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      console.error(`[BATCH JOB LOADER] Error loading job ${jobId.substring(0, 8)}:`, error);
      return null;
    }

    if (!data) {
      console.log(`[BATCH JOB LOADER] Job ${jobId.substring(0, 8)} not found`);
      return null;
    }

    try {
      const batchJob: BatchJob = {
        id: data.id,
        errors: data.errors || null,
        input_file_id: 'db-stored',
        completion_window: '24h',
        status: data.status as any,
        output_file_id: data.output_file_id || null,
        created_at: data.created_at_timestamp,
        in_progress_at: data.in_progress_at_timestamp || null,
        expired_at: data.expired_at_timestamp || null,
        finalizing_at: data.finalizing_at_timestamp || null,
        completed_at: data.completed_at_timestamp || null,
        failed_at: data.failed_at_timestamp || null,
        cancelled_at: data.cancelled_at_timestamp || null,
        request_counts: {
          total: data.request_counts_total,
          completed: data.request_counts_completed,
          failed: data.request_counts_failed
        },
        metadata: data.metadata as any || null
      };

      console.log(`[BATCH JOB LOADER] Successfully loaded job ${jobId.substring(0, 8)} with status: ${batchJob.status}`);
      return batchJob;
    } catch (error) {
      console.error(`[BATCH JOB LOADER] Error processing job ${jobId.substring(0, 8)}:`, error);
      return null;
    }
  }
}
