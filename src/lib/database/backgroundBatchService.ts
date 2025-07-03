
import { supabase } from '@/integrations/supabase/client';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';

interface BackgroundSaveResult {
  success: boolean;
  error?: string;
  jobId: string;
}

/**
 * Background service for handling large database operations without blocking user experience
 */
export class BackgroundBatchService {
  private static instance: BackgroundBatchService;
  private saveQueue: Map<string, Promise<BackgroundSaveResult>> = new Map();
  
  static getInstance(): BackgroundBatchService {
    if (!BackgroundBatchService.instance) {
      BackgroundBatchService.instance = new BackgroundBatchService();
    }
    return BackgroundBatchService.instance;
  }

  /**
   * Queue a batch job for background database save
   */
  async queueBatchJobSave(
    batchJob: BatchJob,
    payeeRowData: PayeeRowData
  ): Promise<Promise<BackgroundSaveResult>> {
    const jobId = batchJob.id;
    
    if (this.saveQueue.has(jobId)) {
      productionLogger.debug(`[BACKGROUND SERVICE] Job ${jobId} already queued`);
      return this.saveQueue.get(jobId)!;
    }

    const savePromise = this.performBackgroundSave(batchJob, payeeRowData);
    this.saveQueue.set(jobId, savePromise);
    
    // Clean up completed jobs
    savePromise.finally(() => {
      setTimeout(() => this.saveQueue.delete(jobId), 30000); // Clean up after 30s
    });

    return savePromise;
  }

  /**
   * Check if a job is currently being saved
   */
  isJobBeingSaved(jobId: string): boolean {
    return this.saveQueue.has(jobId);
  }

  /**
   * Get the save status of a job
   */
  async getSaveStatus(jobId: string): Promise<BackgroundSaveResult | null> {
    const savePromise = this.saveQueue.get(jobId);
    if (!savePromise) return null;
    
    try {
      return await savePromise;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        jobId
      };
    }
  }

  private async performBackgroundSave(
    batchJob: BatchJob,
    payeeRowData: PayeeRowData
  ): Promise<BackgroundSaveResult> {
    try {
      productionLogger.debug(`[BACKGROUND SERVICE] Starting background save for job ${batchJob.id}`);
      
      await this.chunkedBatchJobSave(batchJob, payeeRowData);
      
      productionLogger.debug(`[BACKGROUND SERVICE] Successfully saved job ${batchJob.id} in background`);
      return { success: true, jobId: batchJob.id };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      productionLogger.error(`[BACKGROUND SERVICE] Background save failed for job ${batchJob.id}:`, error);
      
      return {
        success: false,
        error: errorMessage,
        jobId: batchJob.id
      };
    }
  }

  private async chunkedBatchJobSave(
    batchJob: BatchJob,
    payeeRowData: PayeeRowData
  ): Promise<void> {
    const originalDataCount = payeeRowData.originalFileData.length;
    const payeeCount = payeeRowData.uniquePayeeNames.length;
    
    // Determine chunk strategy based on data size
    const isLargeFile = originalDataCount > 5000 || payeeCount > 1000;
    const chunkSize = isLargeFile ? 2000 : 5000;
    
    productionLogger.debug(`[BACKGROUND SERVICE] Chunked save: ${originalDataCount} rows, ${payeeCount} payees, chunk size: ${chunkSize}`);

    if (originalDataCount <= chunkSize) {
      // Small file - save directly
      await this.saveBatchJobDirect(batchJob, payeeRowData);
      return;
    }

    // Large file - use chunked approach
    await this.saveBatchJobChunked(batchJob, payeeRowData, chunkSize);
  }

  private async saveBatchJobDirect(
    batchJob: BatchJob,
    payeeRowData: PayeeRowData
  ): Promise<void> {
    const dbRecord = this.prepareBatchJobRecord(batchJob, payeeRowData);
    
    const { error } = await supabase
      .from('batch_jobs')
      .upsert(dbRecord, {
        onConflict: 'id',
        ignoreDuplicates: false
      });

    if (error) {
      throw new Error(`Direct save failed: ${error.message}`);
    }
  }

  private async saveBatchJobChunked(
    batchJob: BatchJob,
    payeeRowData: PayeeRowData,
    chunkSize: number
  ): Promise<void> {
    // First, save metadata and basic info
    const baseRecord = this.prepareBatchJobRecord(batchJob, payeeRowData);
    
    // For chunked saves, store data references instead of full data initially
    const metaRecord = {
      ...baseRecord,
      original_file_data: { chunked: true, total_rows: payeeRowData.originalFileData.length },
      row_mappings: { chunked: true, total_mappings: payeeRowData.rowMappings.length },
      metadata: {
        ...(baseRecord.metadata as any || {}),
        chunked_save: {
          status: 'in_progress',
          chunk_size: chunkSize,
          total_chunks: Math.ceil(payeeRowData.originalFileData.length / chunkSize)
        }
      }
    };

    // Save initial record
    const { error: metaError } = await supabase
      .from('batch_jobs')
      .upsert(metaRecord, { onConflict: 'id' });

    if (metaError) {
      throw new Error(`Chunked save initialization failed: ${metaError.message}`);
    }

    // Process chunks with delays to prevent timeouts
    const chunks = this.chunkArray(payeeRowData.originalFileData, chunkSize);
    const mappingChunks = this.chunkArray(payeeRowData.rowMappings, chunkSize);
    
    for (let i = 0; i < chunks.length; i++) {
      productionLogger.debug(`[BACKGROUND SERVICE] Processing chunk ${i + 1}/${chunks.length} for job ${batchJob.id}`);
      
      // Add small delay between chunks to prevent overwhelming the database
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // For the final chunk, save the complete data
      const isLastChunk = i === chunks.length - 1;
      
      if (isLastChunk) {
        const finalRecord = {
          ...baseRecord,
          metadata: {
            ...(baseRecord.metadata as any || {}),
            chunked_save: {
              status: 'completed',
              chunks_processed: chunks.length,
              completion_time: new Date().toISOString()
            }
          }
        };

        const { error: finalError } = await supabase
          .from('batch_jobs')
          .update(finalRecord)
          .eq('id', batchJob.id);

        if (finalError) {
          throw new Error(`Final chunk save failed: ${finalError.message}`);
        }
      }
    }

    productionLogger.debug(`[BACKGROUND SERVICE] Completed chunked save for job ${batchJob.id}`);
  }

  private prepareBatchJobRecord(batchJob: BatchJob, payeeRowData: PayeeRowData) {
    return {
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
        background_save: {
          version: '1.0',
          optimized: true,
          save_time: new Date().toISOString()
        }
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
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

export const backgroundBatchService = BackgroundBatchService.getInstance();
