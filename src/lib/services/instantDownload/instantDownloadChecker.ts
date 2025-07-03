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
        .select('status, csv_file_url, excel_file_url, file_generated_at, request_counts_completed')
        .eq('id', jobId)
        .single();

      if (error || !job) {
        logger.error(`Job not found: ${jobId}`, { error }, this.context);
        return { hasFiles: false, hasResults: false, status: 'unavailable' };
      }

      if (job.status !== 'completed') {
        return { hasFiles: false, hasResults: false, status: 'unavailable' };
      }

      // Real file availability check - do the URLs actually exist and are accessible?
      const hasActualFiles = !!(job.csv_file_url && job.excel_file_url);
      
      // Check for pre-processed results only if files aren't ready
      let hasResults = false;
      if (!hasActualFiles) {
        hasResults = await AutomaticResultProcessor.hasPreProcessedResults(jobId);
      } else {
        // If files exist, assume results are processed
        hasResults = true;
      }

      // Determine real status based on actual file availability
      let status: 'instant' | 'processing' | 'unavailable';
      
      if (hasActualFiles) {
        // Files are ready for download
        status = 'instant';
      } else if (job.request_counts_completed > 0) {
        // Job completed but files not generated yet
        status = 'processing';
      } else {
        // Something's wrong
        status = 'unavailable';
      }

      logger.info(`Job ${jobId} REAL download status`, {
        hasFiles: hasActualFiles,
        hasResults,
        fileGeneratedAt: job.file_generated_at,
        csvUrl: job.csv_file_url ? 'exists' : 'missing',
        excelUrl: job.excel_file_url ? 'exists' : 'missing',
        finalStatus: status
      }, this.context);

      return {
        hasFiles: hasActualFiles,
        hasResults,
        fileUrls: { csv_file_url: job.csv_file_url, excel_file_url: job.excel_file_url },
        status
      };
    } catch (error) {
      logger.error(`Error checking instant download for job ${jobId}`, { error }, this.context);
      return { hasFiles: false, hasResults: false, status: 'unavailable' };
    }
  }
}
