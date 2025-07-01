
import { BatchProcessingResult } from '@/lib/types';
import { logger } from '@/lib/logging/logger';
import { FileGeneratorUtils } from './fileGeneratorUtils';
import { FileStorageUtils } from './fileStorageUtils';
import { BatchJobFileUpdater } from './batchJobFileUpdater';
import { FileCleanupService } from './fileCleanupService';

export class PreGeneratedFileService {
  private static context = 'PRE_GENERATED_FILES';

  /**
   * Generate and store CSV and Excel files after batch processing completes
   */
  static async generateAndStoreFiles(
    jobId: string,
    batchResult: BatchProcessingResult
  ): Promise<{
    csvUrl?: string;
    excelUrl?: string;
    fileSizeBytes?: number;
    error?: string;
  }> {
    logger.info(`Generating pre-generated files for job ${jobId}`, undefined, this.context);
    
    try {
      // Generate file names
      const { csvFileName, excelFileName } = FileGeneratorUtils.generateFileNames(jobId);

      // Generate file blobs
      const { csvBlob, excelBlob, fileSizeBytes } = await FileGeneratorUtils.generateFileBlobs(batchResult);

      // Upload CSV to Supabase Storage
      const csvUploadResult = await FileStorageUtils.uploadFile(
        'batch-results',
        csvFileName,
        csvBlob,
        'text/csv'
      );

      if (!csvUploadResult.success) {
        throw new Error(csvUploadResult.error || 'CSV upload failed');
      }

      // Upload Excel to Supabase Storage
      const excelUploadResult = await FileStorageUtils.uploadFile(
        'batch-results',
        excelFileName,
        excelBlob,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      if (!excelUploadResult.success) {
        throw new Error(excelUploadResult.error || 'Excel upload failed');
      }

      // Update batch job record with file URLs
      const updateResult = await BatchJobFileUpdater.updateJobWithFileUrls(
        jobId,
        csvUploadResult.publicUrl!,
        excelUploadResult.publicUrl!,
        fileSizeBytes
      );

      if (!updateResult.success) {
        logger.error(`Failed to update batch job with file URLs: ${updateResult.error}`, { jobId }, this.context);
      }

      logger.info(`Successfully generated and stored files for job ${jobId}`, {
        csvUrl: csvUploadResult.publicUrl,
        excelUrl: excelUploadResult.publicUrl,
        fileSizeBytes
      }, this.context);

      return {
        csvUrl: csvUploadResult.publicUrl,
        excelUrl: excelUploadResult.publicUrl,
        fileSizeBytes
      };

    } catch (error) {
      logger.error(`Failed to generate files for job ${jobId}`, { error }, this.context);
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Download file directly from storage URL
   */
  static async downloadFileFromStorage(url: string, filename: string): Promise<void> {
    return FileStorageUtils.downloadFileFromStorage(url, filename);
  }

  /**
   * Clean up old files (older than 30 days)
   */
  static async cleanupOldFiles(): Promise<void> {
    return FileCleanupService.cleanupOldFiles();
  }
}
