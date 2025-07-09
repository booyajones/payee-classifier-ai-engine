import { supabase } from '@/integrations/supabase/client';
import { InstantDownloadChecker } from './instantDownloadChecker';
import { logger } from '@/lib/logging/logger';
import { AutomaticResultProcessor } from '../automaticResultProcessor';
import { EnhancedFileGenerationService } from '../enhancedFileGenerationService';

/**
 * Result interface for single job processing
 */
export interface SingleJobResult {
  success: boolean;
  error?: string;
}

/**
 * Ensures that individual jobs are ready for instant download
 */
export class SingleJobProcessor {
  private static context = 'SINGLE_JOB_PROCESSOR';

  /**
   * Ensure a specific job is ready for instant download
   */
  static async ensureJobReady(jobId: string): Promise<SingleJobResult> {
    try {
      logger.info(`Ensuring job ${jobId} is ready for instant download`, undefined, this.context);

      // First check current status
      const downloadStatus = await InstantDownloadChecker.hasInstantDownload(jobId);
      
      if (downloadStatus.status === 'instant') {
        logger.info(`Job ${jobId} already has instant download ready`, undefined, this.context);
        return { success: true };
      }

      // Get job data from database
      const { data: jobData, error } = await supabase
        .from('batch_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error || !jobData) {
        const errorMsg = `Job ${jobId} not found in database`;
        logger.error(errorMsg, { error }, this.context);
        return { success: false, error: errorMsg };
      }

      if (jobData.status !== 'completed') {
        const errorMsg = `Job ${jobId} is not completed (status: ${jobData.status})`;
        logger.warn(errorMsg, undefined, this.context);
        return { success: false, error: errorMsg };
      }

      // Convert to BatchJob format for processing
      const batchJob = this.convertToBatchJob(jobData);

      // Step 1: Ensure results are processed and stored in database
      if (!downloadStatus.hasResults) {
        logger.info(`Processing results for job ${jobId}`, undefined, this.context);
        
        const processResult = await AutomaticResultProcessor.processCompletedBatch(batchJob);
        if (!processResult) {
          const errorMsg = `Failed to process results for job ${jobId}`;
          logger.error(errorMsg, undefined, this.context);
          return { success: false, error: errorMsg };
        }
      }

      // Step 2: Ensure files are generated
      if (!downloadStatus.hasFiles) {
        logger.info(`Generating files for job ${jobId}`, undefined, this.context);
        
        const fileResult = await EnhancedFileGenerationService.processCompletedJob(batchJob);
        if (!fileResult.success) {
          const errorMsg = `Failed to generate files for job ${jobId}: ${fileResult.error}`;
          logger.error(errorMsg, undefined, this.context);
          return { success: false, error: errorMsg };
        }
      }

      logger.info(`Successfully ensured job ${jobId} is ready for instant download`, undefined, this.context);
      return { success: true };

    } catch (error) {
      const errorMsg = `Error ensuring job ${jobId} is ready: ${error instanceof Error ? error.message : 'Unknown error'}`;
      logger.error(errorMsg, { error }, this.context);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Convert database job data to BatchJob format
   */
  private static convertToBatchJob(jobData: any): any {
    let parsedMetadata;
    if (jobData.metadata) {
      try {
        const metadataValue = typeof jobData.metadata === 'string' 
          ? JSON.parse(jobData.metadata) 
          : jobData.metadata;
        
        parsedMetadata = {
          payee_count: metadataValue?.payee_count || 0,
          description: metadataValue?.description || 'Payee classification batch'
        };
      } catch (error) {
        parsedMetadata = {
          payee_count: 0,
          description: 'Payee classification batch'
        };
      }
    }

    return {
      id: jobData.id,
      status: jobData.status,
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
      metadata: parsedMetadata,
      errors: jobData.errors ? (typeof jobData.errors === 'string' ? JSON.parse(jobData.errors) : jobData.errors) : undefined,
      output_file_id: jobData.output_file_id || undefined
    };
  }
}