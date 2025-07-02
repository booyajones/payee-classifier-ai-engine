import { supabase } from '@/integrations/supabase/client';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { AutomaticResultProcessor } from './automaticResultProcessor';
import { EnhancedFileGenerationService } from './enhancedFileGenerationService';
import { logger } from '@/lib/logging/logger';

/**
 * Service for ensuring all completed jobs have instant downloads ready
 */
export class InstantDownloadService {
  private static context = 'INSTANT_DOWNLOAD_SERVICE';

  /**
   * Check if a job has instant download files ready
   */
  static async hasInstantDownload(jobId: string): Promise<{
    hasFiles: boolean;
    hasResults: boolean;
    fileUrls?: { csv_file_url: string | null; excel_file_url: string | null };
    status: 'instant' | 'processing' | 'unavailable';
  }> {
    try {
      logger.info(`Checking instant download status for job ${jobId}`, undefined, this.context);

      // Check if job has pre-generated files
      const { data: job, error } = await supabase
        .from('batch_jobs')
        .select('status, csv_file_url, excel_file_url, file_generated_at')
        .eq('id', jobId)
        .single();

      if (error || !job) {
        logger.error(`Job not found: ${jobId}`, { error }, this.context);
        return { hasFiles: false, hasResults: false, status: 'unavailable' };
      }

      if (job.status !== 'completed') {
        return { hasFiles: false, hasResults: false, status: 'unavailable' };
      }

      // Check for pre-processed results
      const hasResults = await AutomaticResultProcessor.hasPreProcessedResults(jobId);
      const hasFiles = !!(job.csv_file_url && job.excel_file_url);

      logger.info(`Job ${jobId} instant download status`, {
        hasFiles,
        hasResults,
        fileGeneratedAt: job.file_generated_at
      }, this.context);

      return {
        hasFiles,
        hasResults,
        fileUrls: { csv_file_url: job.csv_file_url, excel_file_url: job.excel_file_url },
        status: (hasFiles && hasResults) ? 'instant' : 'processing'
      };
    } catch (error) {
      logger.error(`Error checking instant download for job ${jobId}`, { error }, this.context);
      return { hasFiles: false, hasResults: false, status: 'unavailable' };
    }
  }

  /**
   * Process all existing completed jobs to ensure they have instant downloads
   */
  static async processExistingCompletedJobs(): Promise<{
    processed: number;
    alreadyReady: number;
    failed: number;
    errors: string[];
  }> {
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
          const downloadStatus = await this.hasInstantDownload(jobId);
          
          if (downloadStatus.status === 'instant') {
            logger.info(`Job ${jobId} already has instant download ready`, undefined, this.context);
            alreadyReady++;
            continue;
          }

          // Convert database row to BatchJob format
          const batchJob: BatchJob = {
            id: jobData.id,
            status: 'completed',
            created_at: jobData.created_at_timestamp,
            request_counts: {
              total: jobData.request_counts_total,
              completed: jobData.request_counts_completed,
              failed: jobData.request_counts_failed
            },
            completed_at: jobData.completed_at_timestamp,
            metadata: jobData.metadata ? (typeof jobData.metadata === 'string' ? JSON.parse(jobData.metadata) : jobData.metadata) : undefined,
            output_file_id: jobData.output_file_id || undefined
          };

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

  /**
   * Ensure a specific job has instant download ready
   */
  static async ensureJobReady(jobId: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info(`Ensuring job ${jobId} is ready for instant download`, undefined, this.context);

      const downloadStatus = await this.hasInstantDownload(jobId);
      
      if (downloadStatus.status === 'instant') {
        logger.info(`Job ${jobId} already ready`, undefined, this.context);
        return { success: true };
      }

      if (downloadStatus.status === 'unavailable') {
        return { success: false, error: 'Job is not completed or not found' };
      }

      // Get job data
      const { data: jobData, error } = await supabase
        .from('batch_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error || !jobData) {
        return { success: false, error: 'Job not found' };
      }

      // Convert to BatchJob format
      const batchJob: BatchJob = {
        id: jobData.id,
        status: 'completed',
        created_at: jobData.created_at_timestamp,
        request_counts: {
          total: jobData.request_counts_total,
          completed: jobData.request_counts_completed,
          failed: jobData.request_counts_failed
        },
        completed_at: jobData.completed_at_timestamp,
        metadata: jobData.metadata ? (typeof jobData.metadata === 'string' ? JSON.parse(jobData.metadata) : jobData.metadata) : undefined,
        output_file_id: jobData.output_file_id || undefined
      };

      // Process if needed
      if (!downloadStatus.hasResults) {
        const resultSuccess = await AutomaticResultProcessor.processCompletedBatch(batchJob);
        if (!resultSuccess) {
          return { success: false, error: 'Failed to process results' };
        }
      }

      if (!downloadStatus.hasFiles) {
        const fileResult = await EnhancedFileGenerationService.processCompletedJob(batchJob);
        if (!fileResult.success) {
          return { success: false, error: `Failed to generate files: ${fileResult.error}` };
        }
      }

      logger.info(`Job ${jobId} is now ready for instant download`, undefined, this.context);
      return { success: true };

    } catch (error) {
      logger.error(`Error ensuring job ${jobId} is ready`, { error }, this.context);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}