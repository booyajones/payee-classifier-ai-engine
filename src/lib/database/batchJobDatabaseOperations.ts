
import { supabase } from '@/integrations/supabase/client';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';

/**
 * Core database operations for batch jobs
 */
export class BatchJobDatabaseOperations {
  /**
   * Save minimal record immediately for user feedback
   */
  static async saveMinimalBatchJobRecord(
    batchJob: BatchJob,
    payeeRowData: PayeeRowData
  ): Promise<void> {
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
      console.error('[DB BATCH OPERATIONS] Minimal record save failed:', error);
      throw new Error(`Minimal record save failed: ${error.message}`);
    }

    console.log(`[DB BATCH OPERATIONS] Minimal record saved for immediate user feedback: ${batchJob.id}`);
  }

  /**
   * Perform direct save for smaller files
   */
  static async performDirectSave(
    batchJob: BatchJob,
    payeeRowData: PayeeRowData
  ): Promise<void> {
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

    console.log(`[DB BATCH OPERATIONS] Direct save completed for job ${batchJob.id}`);
  }

  /**
   * Delete batch job
   */
  static async deleteBatchJob(jobId: string): Promise<void> {
    console.log(`[DB BATCH OPERATIONS] Deleting batch job ${jobId}`);

    const { error } = await supabase
      .from('batch_jobs')
      .delete()
      .eq('id', jobId);

    if (error) {
      console.error('[DB BATCH OPERATIONS] Error deleting batch job:', error);
      throw new Error(`Failed to delete batch job: ${error.message}`);
    }

    console.log(`[DB BATCH OPERATIONS] Successfully deleted batch job ${jobId}`);
  }

  /**
   * Get batch job count
   */
  static async getBatchJobCount(): Promise<number> {
    const { count, error } = await supabase
      .from('batch_jobs')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('[DB BATCH OPERATIONS] Error getting batch job count:', error);
      return 0;
    }

    return count || 0;
  }
}
