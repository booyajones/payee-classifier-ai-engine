
import { BatchProcessingResult } from '@/lib/types';
import { exportDirectCSV } from '@/lib/classification/batchExporter';
import { logger } from '@/lib/logging/logger';
import * as XLSX from 'xlsx';

export class FileGeneratorUtils {
  private static context = 'FILE_GENERATOR_UTILS';

  /**
   * Generate CSV and Excel blobs from batch result
   */
  static async generateFileBlobs(
    batchResult: BatchProcessingResult
  ): Promise<{
    csvBlob: Blob;
    excelBlob: Blob;
    fileSizeBytes: number;
  }> {
    try {
      logger.info('Generating file blobs from batch result', undefined, this.context);
      
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

      const fileSizeBytes = Math.max(csvBlob.size, excelBlob.size);

      logger.info('Successfully generated file blobs', { fileSizeBytes }, this.context);
      
      return {
        csvBlob,
        excelBlob,
        fileSizeBytes
      };
    } catch (error) {
      logger.error('Failed to generate file blobs', { error }, this.context);
      throw error;
    }
  }

  /**
   * Generate timestamped file names
   */
  static generateFileNames(jobId: string): { csvFileName: string; excelFileName: string } {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return {
      csvFileName: `batch-${jobId}-${timestamp}.csv`,
      excelFileName: `batch-${jobId}-${timestamp}.xlsx`
    };
  }
}
