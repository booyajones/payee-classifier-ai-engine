import { supabase } from '@/integrations/supabase/client';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { AutomaticResultProcessor } from '../automaticResultProcessor';
import { EnhancedFileGenerationService } from '../enhancedFileGenerationService';
import { logger } from '@/lib/logging/logger';
import { InstantDownloadChecker } from './instantDownloadChecker';
import { BatchJobConverter } from './batchJobConverter';

/**
 * Result type for bulk processing operations
 */
export interface BulkProcessingResult {
  processed: number;
  alreadyReady: number;
  failed: number;
  errors: string[];
}

/**
 * Service for bulk processing of completed jobs
 */
export class BulkJobProcessor {
  private static context = 'BULK_JOB_PROCESSOR';

  /**
   * Process all existing completed jobs to ensure they have instant downloads
   */
  static async processExistingCompletedJobs(): Promise<BulkProcessingResult> {
    logger.info('Starting processing of existing completed jobs', undefined, this.context);

    try {
      // Get all completed jobs
      const { data: jobs, error } = await supabase
        .from('batch_jobs')
        .select('*')
        .eq('status', 'completed')
        .gt('request_counts_completed', 0)
        .order('completed_at_timestamp', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch completed jobs: ${error.message}`);
      }

      if (!jobs || jobs.length === 0) {
        logger.info('No completed jobs found to process', undefined, this.context);
        return { processed: 0, alreadyReady: 0, failed: 0, errors: [] };
      }

      logger.info(`Found ${jobs.length} completed jobs to check and process`, undefined, this.context);

      let processed = 0;
      let alreadyReady = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const jobData of jobs) {
        try {
          const jobId = jobData.id;
          logger.info(`Processing job ${jobId}`, undefined, this.context);

          // Check current status
          const downloadStatus = await InstantDownloadChecker.hasInstantDownload(jobId);
          
          if (downloadStatus.status === 'instant') {
            logger.info(`Job ${jobId} already has instant download ready`, undefined, this.context);
            alreadyReady++;
            continue;
          }

          // Convert database row to BatchJob format
          const batchJob = BatchJobConverter.convertToBatchJob(jobData);

          // Process results if not already done
          if (!downloadStatus.hasResults) {
            logger.info(`Processing results for job ${jobId}`, undefined, this.context);
            const resultSuccess = await AutomaticResultProcessor.processCompletedBatch(batchJob);
            
            if (!resultSuccess) {
              throw new Error('Failed to process batch results');
            }
          }

          // Generate files if not already done
          if (!downloadStatus.hasFiles) {
            logger.info(`Generating files for job ${jobId}`, undefined, this.context);
            const fileResult = await EnhancedFileGenerationService.processCompletedJob(batchJob);
            
            if (!fileResult.success) {
              throw new Error(`Failed to generate files: ${fileResult.error}`);
            }
          }

          processed++;
          logger.info(`Successfully processed job ${jobId}`, undefined, this.context);

          // Small delay between jobs to prevent overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          failed++;
          const errorMessage = `Failed to process job ${jobData.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMessage);
          logger.error(errorMessage, { error }, this.context);
        }
      }

      const result = { processed, alreadyReady, failed, errors };
      logger.info('Completed processing of existing jobs', result, this.context);
      
      return result;

    } catch (error) {
      logger.error('Failed to process existing completed jobs', { error }, this.context);
      throw error;
    }
  }
}