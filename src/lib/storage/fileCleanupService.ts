
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logging/logger';
import { FileStorageUtils } from './fileStorageUtils';
import { BatchJobFileUpdater } from './batchJobFileUpdater';

export class FileCleanupService {
  private static context = 'FILE_CLEANUP_SERVICE';

  /**
   * Clean up old files (older than 30 days)
   */
  static async cleanupOldFiles(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get old batch jobs
      const { data: oldJobs, error } = await supabase
        .from('batch_jobs')
        .select('id, csv_file_url, excel_file_url')
        .lt('file_generated_at', thirtyDaysAgo.toISOString())
        .not('csv_file_url', 'is', null);

      if (error || !oldJobs) {
        logger.warn('Failed to fetch old jobs for cleanup', { error }, this.context);
        return;
      }

      for (const job of oldJobs) {
        const filesToRemove: string[] = [];

        // Extract file names from URLs and prepare for deletion
        if (job.csv_file_url) {
          const csvFileName = job.csv_file_url.split('/').pop();
          if (csvFileName) filesToRemove.push(csvFileName);
        }
        
        if (job.excel_file_url) {
          const excelFileName = job.excel_file_url.split('/').pop();
          if (excelFileName) filesToRemove.push(excelFileName);
        }

        // Remove files from storage
        if (filesToRemove.length > 0) {
          await FileStorageUtils.removeFiles('batch-results', filesToRemove);
        }

        // Clear file URLs from database
        await BatchJobFileUpdater.clearJobFileUrls(job.id);
      }

      logger.info(`Cleaned up files for ${oldJobs.length} old batch jobs`, undefined, this.context);
    } catch (error) {
      logger.error('Failed to cleanup old files', { error }, this.context);
    }
  }
}
