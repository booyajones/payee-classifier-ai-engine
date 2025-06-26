
import { supabase } from '@/integrations/supabase/client';
import { BatchJob } from '@/lib/openai/trueBatchAPI';

/**
 * Service for updating batch job status and properties
 */
export class BatchJobUpdater {
  /**
   * Update batch job status with retry logic
   */
  static async updateBatchJobStatus(batchJob: BatchJob): Promise<void> {
    console.log(`[BATCH JOB UPDATER] Updating batch job ${batchJob.id} status to ${batchJob.status}`);

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
        
        console.log(`[BATCH JOB UPDATER] Successfully updated batch job ${batchJob.id} status to ${batchJob.status}`);
        return;
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`[BATCH JOB UPDATER] Status update attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          const delay = 1000 * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Status update failed after ${maxRetries} attempts: ${lastError?.message}`);
  }
}
