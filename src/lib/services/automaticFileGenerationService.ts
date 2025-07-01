
import { supabase } from '@/integrations/supabase/client';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { RetroactiveBatchProcessor } from './retroactiveBatchProcessor';
import { logger } from '@/lib/logging/logger';

export class AutomaticFileGenerationService {
  private static context = 'AUTO_FILE_GENERATION';

  /**
   * Process a newly completed job to automatically generate files
   */
  static async processCompletedJob(job: BatchJob): Promise<void> {
    logger.info(`Auto-processing completed job ${job.id}`, undefined, this.context);

    try {
      // Check if files already exist
      const { data } = await supabase
        .from('batch_jobs')
        .select('csv_file_url, excel_file_url')
        .eq('id', job.id)
        .single();

      if (data?.csv_file_url && data?.excel_file_url) {
        logger.info(`Files already exist for job ${job.id}, skipping`, undefined, this.context);
        return;
      }

      // Generate files using the retroactive processor
      const result = await RetroactiveBatchProcessor.processCompletedJob(job);
      
      if (result.success) {
        logger.info(`Auto-generated files for job ${job.id}`, { 
          processedCount: result.processedCount,
          fileUrls: result.fileUrls
        }, this.context);
      } else {
        logger.error(`Failed to auto-generate files for job ${job.id}`, { 
          error: result.error 
        }, this.context);
      }
    } catch (error) {
      logger.error(`Error in auto file generation for job ${job.id}`, { error }, this.context);
    }
  }

  /**
   * Background service to check for completed jobs without files
   */
  static async processAllCompletedJobsWithoutFiles(): Promise<void> {
    try {
      // Find completed jobs without pre-generated files
      const { data: jobs, error } = await supabase
        .from('batch_jobs')
        .select('*')
        .eq('status', 'completed')
        .or('csv_file_url.is.null,excel_file_url.is.null')
        .gt('request_counts_completed', 0);

      if (error) {
        logger.error('Failed to fetch completed jobs for auto processing', { error }, this.context);
        return;
      }

      if (!jobs || jobs.length === 0) {
        logger.info('No completed jobs need file generation', undefined, this.context);
        return;
      }

      logger.info(`Found ${jobs.length} completed jobs needing file generation`, undefined, this.context);

      // Process each job
      for (const jobData of jobs) {
        const batchJob: BatchJob = {
          id: jobData.id,
          status: jobData.status as any,
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
          metadata: jobData.metadata,
          errors: jobData.errors,
          output_file_id: jobData.output_file_id
        };

        await this.processCompletedJob(batchJob);

        // Small delay between jobs
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      logger.error('Error in background file generation service', { error }, this.context);
    }
  }
}
