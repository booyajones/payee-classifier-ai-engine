
import { supabase } from '@/integrations/supabase/client';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { EnhancedFileGenerationService } from '@/lib/services/enhancedFileGenerationService';
import { AutomaticResultProcessor } from '@/lib/services/automaticResultProcessor';
import { productionLogger } from '@/lib/logging/productionLogger';

/**
 * Service for updating batch job status and properties
 */
export class BatchJobUpdater {
  /**
   * Update batch job status with synchronous processing for completion
   */
  static async updateBatchJobStatus(batchJob: BatchJob): Promise<void> {
    productionLogger.info(`Updating batch job ${batchJob.id} status to ${batchJob.status}`, null, 'BATCH_JOB_UPDATER');

    // Handle OpenAI completion -> processing_results transition
    if (batchJob.status === 'completed' && batchJob.request_counts.completed > 0) {
      productionLogger.info(`Job ${batchJob.id} completed by OpenAI, starting synchronous processing`, null, 'BATCH_JOB_UPDATER');
      
      // First, set status to processing_results
      await this.updateJobStatus(batchJob.id, 'processing_results', batchJob);
      
      // Process results and generate files synchronously
      const success = await this.processJobSynchronously(batchJob);
      
      if (success) {
        // Only now mark as truly completed
        await this.updateJobStatus(batchJob.id, 'completed', batchJob);
        productionLogger.info(`Job ${batchJob.id} fully processed and marked as completed`, null, 'BATCH_JOB_UPDATER');
      } else {
        // Mark as failed if processing failed
        await this.updateJobStatus(batchJob.id, 'failed', batchJob);
        productionLogger.error(`Job ${batchJob.id} processing failed, marked as failed`, null, 'BATCH_JOB_UPDATER');
      }
      
      return;
    }

    // Handle all other status updates normally
    await this.updateJobStatus(batchJob.id, batchJob.status, batchJob);
  }

  /**
   * Update job status in database with retry logic
   */
  private static async updateJobStatus(jobId: string, status: string, batchJob: BatchJob): Promise<void> {
    const updateData = {
      status: status,
      in_progress_at_timestamp: batchJob.in_progress_at || null,
      finalizing_at_timestamp: batchJob.finalizing_at || null,
      completed_at_timestamp: status === 'completed' ? Math.floor(Date.now() / 1000) : batchJob.completed_at || null,
      failed_at_timestamp: status === 'failed' ? Math.floor(Date.now() / 1000) : batchJob.failed_at || null,
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
          .eq('id', jobId);

        if (error) {
          throw new Error(`Status update failed: ${error.message}`);
        }
        
        productionLogger.info(`Successfully updated batch job ${jobId} status to ${status}`, null, 'BATCH_JOB_UPDATER');
        return;
        
      } catch (error) {
        lastError = error as Error;
        productionLogger.warn(`Status update attempt ${attempt} failed`, error, 'BATCH_JOB_UPDATER');
        
        if (attempt < maxRetries) {
          const delay = 1000 * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Status update failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Process completed job synchronously - must complete before marking job as done
   */
  private static async processJobSynchronously(batchJob: BatchJob): Promise<boolean> {
    try {
      productionLogger.info(`Starting synchronous processing for job ${batchJob.id}`, null, 'BATCH_JOB_UPDATER');
      
      // Process and store results
      const resultSuccess = await AutomaticResultProcessor.processCompletedBatch(batchJob);
      
      if (!resultSuccess) {
        productionLogger.error(`Result processing failed for ${batchJob.id}`, null, 'BATCH_JOB_UPDATER');
        return false;
      }
      
      productionLogger.info(`Result processing completed for ${batchJob.id}`, null, 'BATCH_JOB_UPDATER');
      
      // Generate download files
      const fileResult = await EnhancedFileGenerationService.processCompletedJob(batchJob);
      
      if (!fileResult.success) {
        productionLogger.error(`File generation failed for ${batchJob.id}: ${fileResult.error}`, null, 'BATCH_JOB_UPDATER');
        return false;
      }
      
      productionLogger.info(`Synchronous processing successful for ${batchJob.id}`, null, 'BATCH_JOB_UPDATER');
      return true;
      
    } catch (error) {
      productionLogger.error(`Synchronous processing failed for ${batchJob.id}`, error, 'BATCH_JOB_UPDATER');
      return false;
    }
  }
}
