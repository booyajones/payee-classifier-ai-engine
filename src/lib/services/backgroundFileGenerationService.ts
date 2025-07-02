import { supabase } from '@/integrations/supabase/client';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { EnhancedFileGenerationService } from './enhancedFileGenerationService';
import { AutomaticResultProcessor } from './automaticResultProcessor';
import { productionLogger } from '@/lib/logging/productionLogger';

/**
 * Background service for processing file generation queue
 */
export class BackgroundFileGenerationService {
  private static isRunning = false;
  private static intervalId: NodeJS.Timeout | null = null;
  private static readonly POLL_INTERVAL = 30000; // 30 seconds
  private static readonly MAX_RETRIES = 3;

  /**
   * Start the background service
   */
  static start(): void {
    if (this.isRunning) {
      productionLogger.warn('Background file generation service already running', undefined, 'BACKGROUND_FILE_GEN');
      return;
    }

    this.isRunning = true;
    productionLogger.info('Starting background file generation service', undefined, 'BACKGROUND_FILE_GEN');
    
    // Process immediately
    this.processQueue().catch(error => {
      productionLogger.error('Initial queue processing failed', error, 'BACKGROUND_FILE_GEN');
    });

    // Set up periodic processing
    this.intervalId = setInterval(() => {
      this.processQueue().catch(error => {
        productionLogger.error('Periodic queue processing failed', error, 'BACKGROUND_FILE_GEN');
      });
    }, this.POLL_INTERVAL);
  }

  /**
   * Stop the background service
   */
  static stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    productionLogger.info('Stopped background file generation service', undefined, 'BACKGROUND_FILE_GEN');
  }

  /**
   * Process pending items in the file generation queue
   */
  private static async processQueue(): Promise<void> {
    try {
      // First, reset any items stuck in processing for more than 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      await supabase
        .from('file_generation_queue')
        .update({
          status: 'pending',
          retry_count: 0,
          last_error: 'Reset due to processing timeout',
          updated_at: new Date().toISOString()
        })
        .eq('status', 'processing')
        .lt('updated_at', tenMinutesAgo);

      // Get pending queue items
      const { data: queueItems, error } = await supabase
        .from('file_generation_queue')
        .select('*')
        .eq('status', 'pending')
        .lt('retry_count', this.MAX_RETRIES)
        .order('created_at', { ascending: true })
        .limit(3); // Reduced from 5 to 3 for more reliable processing

      if (error) {
        productionLogger.error('Failed to fetch queue items', error, 'BACKGROUND_FILE_GEN');
        return;
      }

      if (!queueItems || queueItems.length === 0) {
        // Check for completed jobs without files that might have been missed
        await this.checkMissedJobs();
        return;
      }

      productionLogger.info(`Processing ${queueItems.length} queue items`, undefined, 'BACKGROUND_FILE_GEN');

      // Process each queue item with error isolation
      for (const item of queueItems) {
        try {
          await this.processQueueItem(item);
          // Add small delay between items to prevent overwhelming
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (itemError) {
          productionLogger.error(`Failed to process item ${item.id}`, itemError, 'BACKGROUND_FILE_GEN');
          // Continue with next item even if one fails
        }
      }
    } catch (error) {
      productionLogger.error('Error processing file generation queue', error, 'BACKGROUND_FILE_GEN');
    }
  }

  /**
   * Process a single queue item
   */
  private static async processQueueItem(item: any): Promise<void> {
    const { id, batch_job_id, retry_count } = item;
    
    try {
      // Mark as processing
      await supabase
        .from('file_generation_queue')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', id);

      // Get the batch job details
      const { data: jobData, error: jobError } = await supabase
        .from('batch_jobs')
        .select('*')
        .eq('id', batch_job_id)
        .single();

      if (jobError || !jobData) {
        throw new Error(`Failed to fetch batch job: ${jobError?.message}`);
      }

      // Convert to BatchJob format
      const batchJob: BatchJob = {
        id: jobData.id,
        status: jobData.status as BatchJob['status'],
        created_at: jobData.created_at_timestamp,
        request_counts: {
          total: jobData.request_counts_total,
          completed: jobData.request_counts_completed,
          failed: jobData.request_counts_failed
        },
        in_progress_at: jobData.in_progress_at_timestamp,
        finalizing_at: jobData.finalizing_at_timestamp,
        completed_at: jobData.completed_at_timestamp,
        failed_at: jobData.failed_at_timestamp,
        expired_at: jobData.expired_at_timestamp,
        cancelled_at: jobData.cancelled_at_timestamp,
        metadata: jobData.metadata ? (typeof jobData.metadata === 'string' ? JSON.parse(jobData.metadata) : jobData.metadata) : undefined,
        errors: jobData.errors ? (typeof jobData.errors === 'string' ? JSON.parse(jobData.errors) : jobData.errors) : undefined,
        output_file_id: jobData.output_file_id || undefined
      };

      // Process results and generate files
      await AutomaticResultProcessor.processCompletedBatch(batchJob);
      const fileResult = await EnhancedFileGenerationService.processCompletedJob(batchJob);

      if (!fileResult.success) {
        throw new Error(`File generation failed: ${fileResult.error}`);
      }

      // Mark as completed
      await supabase
        .from('file_generation_queue')
        .update({ 
          status: 'completed', 
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      productionLogger.info(`Successfully processed queue item for job ${batch_job_id}`, undefined, 'BACKGROUND_FILE_GEN');

    } catch (error) {
      productionLogger.error(`Failed to process queue item for job ${batch_job_id}`, error, 'BACKGROUND_FILE_GEN');

      // Update retry count and error
      const newRetryCount = retry_count + 1;
      const status = newRetryCount >= this.MAX_RETRIES ? 'failed' : 'pending';
      
      await supabase
        .from('file_generation_queue')
        .update({
          status,
          retry_count: newRetryCount,
          last_error: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
    }
  }

  /**
   * Check for completed jobs that might have been missed by the trigger
   */
  private static async checkMissedJobs(): Promise<void> {
    try {
      const { data: missedJobs, error } = await supabase
        .from('batch_jobs')
        .select('id')
        .eq('status', 'completed')
        .gt('request_counts_completed', 0)
        .or('csv_file_url.is.null,excel_file_url.is.null')
        .limit(10);

      if (error || !missedJobs || missedJobs.length === 0) return;

      productionLogger.info(`Found ${missedJobs.length} missed jobs, adding to queue`, undefined, 'BACKGROUND_FILE_GEN');

      // Add missed jobs to queue
      for (const job of missedJobs) {
        await supabase
          .from('file_generation_queue')
          .upsert({
            batch_job_id: job.id,
            status: 'pending',
            retry_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'batch_job_id'
          });
      }
    } catch (error) {
      productionLogger.error('Error checking for missed jobs', error, 'BACKGROUND_FILE_GEN');
    }
  }

  /**
   * Get queue status for monitoring
   */
  static async getQueueStatus(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('file_generation_queue')
        .select('status')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      if (error || !data) {
        return { pending: 0, processing: 0, completed: 0, failed: 0 };
      }

      const counts = data.reduce((acc, item) => {
        acc[item.status as keyof typeof acc] = (acc[item.status as keyof typeof acc] || 0) + 1;
        return acc;
      }, { pending: 0, processing: 0, completed: 0, failed: 0 });

      return counts;
    } catch (error) {
      productionLogger.error('Error getting queue status', error, 'BACKGROUND_FILE_GEN');
      return { pending: 0, processing: 0, completed: 0, failed: 0 };
    }
  }
}