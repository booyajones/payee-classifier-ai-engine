
import { supabase } from '@/integrations/supabase/client';
import { BatchProcessingResult } from '@/lib/types/unified';
import { exportDirectCSV } from '@/lib/classification/batchExporter';
import { logger } from '@/lib/logging/logger';
import * as XLSX from 'xlsx';

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
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const csvFileName = `batch-${jobId}-${timestamp}.csv`;
      const excelFileName = `batch-${jobId}-${timestamp}.xlsx`;

      // Generate CSV data
      const { headers, rows } = await exportDirectCSV(batchResult);
      
      // Create CSV file
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      const csvBlob = new Blob([csvContent], { type: 'text/csv' });
      
      // Create Excel file
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Payee Classifications');
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const excelBlob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      // Upload CSV to Supabase Storage
      const { data: csvData, error: csvError } = await supabase.storage
        .from('batch-results')
        .upload(csvFileName, csvBlob, {
          contentType: 'text/csv',
          upsert: false
        });

      if (csvError) {
        throw new Error(`CSV upload failed: ${csvError.message}`);
      }

      // Upload Excel to Supabase Storage
      const { data: excelData, error: excelError } = await supabase.storage
        .from('batch-results')
        .upload(excelFileName, excelBlob, {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          upsert: false
        });

      if (excelError) {
        throw new Error(`Excel upload failed: ${excelError.message}`);
      }

      // Get public URLs
      const { data: csvUrl } = supabase.storage
        .from('batch-results')
        .getPublicUrl(csvFileName);

      const { data: excelUrl } = supabase.storage
        .from('batch-results')
        .getPublicUrl(excelFileName);

      const fileSizeBytes = Math.max(csvBlob.size, excelBlob.size);

      // Update batch job record with file URLs
      const { error: updateError } = await supabase
        .from('batch_jobs')
        .update({
          csv_file_url: csvUrl.publicUrl,
          excel_file_url: excelUrl.publicUrl,
          file_generated_at: new Date().toISOString(),
          file_size_bytes: fileSizeBytes
        })
        .eq('id', jobId);

      if (updateError) {
        logger.error(`Failed to update batch job with file URLs: ${updateError.message}`, { jobId }, this.context);
      }

      logger.info(`Successfully generated and stored files for job ${jobId}`, {
        csvUrl: csvUrl.publicUrl,
        excelUrl: excelUrl.publicUrl,
        fileSizeBytes
      }, this.context);

      return {
        csvUrl: csvUrl.publicUrl,
        excelUrl: excelUrl.publicUrl,
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
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      logger.error('Failed to download file from storage', { url, error }, this.context);
      throw error;
    }
  }

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
        // Extract file names from URLs and delete from storage
        if (job.csv_file_url) {
          const csvFileName = job.csv_file_url.split('/').pop();
          if (csvFileName) {
            await supabase.storage.from('batch-results').remove([csvFileName]);
          }
        }
        
        if (job.excel_file_url) {
          const excelFileName = job.excel_file_url.split('/').pop();
          if (excelFileName) {
            await supabase.storage.from('batch-results').remove([excelFileName]);
          }
        }

        // Clear file URLs from database
        await supabase
          .from('batch_jobs')
          .update({
            csv_file_url: null,
            excel_file_url: null,
            file_generated_at: null,
            file_size_bytes: null
          })
          .eq('id', job.id);
      }

      logger.info(`Cleaned up files for ${oldJobs.length} old batch jobs`, undefined, this.context);
    } catch (error) {
      logger.error('Failed to cleanup old files', { error }, this.context);
    }
  }
}
