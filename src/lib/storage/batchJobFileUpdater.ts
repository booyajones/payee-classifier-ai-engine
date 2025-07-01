
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logging/logger';

export class BatchJobFileUpdater {
  private static context = 'BATCH_JOB_FILE_UPDATER';

  /**
   * Update batch job record with file URLs and metadata
   */
  static async updateJobWithFileUrls(
    jobId: string,
    csvUrl: string,
    excelUrl: string,
    fileSizeBytes: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('batch_jobs')
        .update({
          csv_file_url: csvUrl,
          excel_file_url: excelUrl,
          file_generated_at: new Date().toISOString(),
          file_size_bytes: fileSizeBytes
        })
        .eq('id', jobId);

      if (error) {
        logger.error(`Failed to update batch job with file URLs`, { jobId, error }, this.context);
        return {
          success: false,
          error: error.message
        };
      }

      logger.info(`Successfully updated batch job with file URLs`, {
        jobId,
        csvUrl,
        excelUrl,
        fileSizeBytes
      }, this.context);

      return { success: true };
    } catch (error) {
      logger.error(`Error updating batch job with file URLs`, { jobId, error }, this.context);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Clear file URLs from batch job record
   */
  static async clearJobFileUrls(jobId: string): Promise<void> {
    try {
      await supabase
        .from('batch_jobs')
        .update({
          csv_file_url: null,
          excel_file_url: null,
          file_generated_at: null,
          file_size_bytes: null
        })
        .eq('id', jobId);

      logger.info(`Cleared file URLs for job ${jobId}`, undefined, this.context);
    } catch (error) {
      logger.error(`Failed to clear file URLs for job ${jobId}`, { error }, this.context);
    }
  }
}
