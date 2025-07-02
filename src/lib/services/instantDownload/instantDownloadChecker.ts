import { supabase } from '@/integrations/supabase/client';
import { AutomaticResultProcessor } from '../automaticResultProcessor';
import { logger } from '@/lib/logging/logger';

/**
 * Types for instant download status
 */
export interface InstantDownloadStatus {
  hasFiles: boolean;
  hasResults: boolean;
  fileUrls?: { csv_file_url: string | null; excel_file_url: string | null };
  status: 'instant' | 'processing' | 'unavailable';
}

/**
 * Service for checking instant download status
 */
export class InstantDownloadChecker {
  private static context = 'INSTANT_DOWNLOAD_CHECKER';

  /**
   * Check if a job has instant download files ready
   */
  static async hasInstantDownload(jobId: string): Promise<InstantDownloadStatus> {
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
}