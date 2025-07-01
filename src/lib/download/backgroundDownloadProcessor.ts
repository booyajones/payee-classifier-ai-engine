
import { BatchProcessingResult, PayeeClassification } from '../types';
import { exportDirectCSV } from '../classification/batchExporter';
import * as XLSX from 'xlsx';

export interface DownloadOptions {
  format: 'csv' | 'excel';
  onProgress?: (processed: number, total: number, stage: string) => void;
  onCancel?: () => boolean; // Returns true if cancelled
}

export interface DownloadResult {
  success: boolean;
  blob?: Blob;
  filename?: string;
  error?: string;
}

class BackgroundDownloadProcessor {
  private cancelledDownloads = new Set<string>();

  async processDownload(
    downloadId: string,
    batchResult: BatchProcessingResult,
    options: DownloadOptions
  ): Promise<DownloadResult> {
    try {
      const { format, onProgress } = options;
      
      // Check for cancellation
      if (this.isCancelled(downloadId)) {
        return { success: false, error: 'Download cancelled' };
      }

      onProgress?.(0, 100, 'Preparing export data');

      // Phase 1: Get export data with progress
      const exportData = await this.getExportDataWithProgress(
        batchResult, 
        downloadId,
        (progress) => onProgress?.(progress * 0.6, 100, 'Processing results')
      );

      if (this.isCancelled(downloadId)) {
        return { success: false, error: 'Download cancelled' };
      }

      onProgress?.(60, 100, `Generating ${format.toUpperCase()} file`);

      // Phase 2: Generate file
      const result = format === 'csv' 
        ? await this.generateCSV(exportData, downloadId, onProgress)
        : await this.generateExcel(exportData, downloadId, onProgress);

      if (this.isCancelled(downloadId)) {
        return { success: false, error: 'Download cancelled' };
      }

      onProgress?.(100, 100, 'Download complete');
      return result;

    } catch (error) {
      console.error(`[DOWNLOAD PROCESSOR] Error processing ${downloadId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      // Cleanup
      this.cancelledDownloads.delete(downloadId);
    }
  }

  private async getExportDataWithProgress(
    batchResult: BatchProcessingResult,
    downloadId: string,
    onProgress: (progress: number) => void
  ) {
    // Process in chunks to allow for cancellation and progress updates
    const chunkSize = 100;
    const results = batchResult.results;
    let processedCount = 0;

    onProgress(10);

    // Simulate chunked processing for large datasets
    if (results.length > 1000) {
      for (let i = 0; i < results.length; i += chunkSize) {
        if (this.isCancelled(downloadId)) break;
        
        // Small delay to allow cancellation check
        await new Promise(resolve => setTimeout(resolve, 10));
        
        processedCount = Math.min(i + chunkSize, results.length);
        const progress = (processedCount / results.length) * 90 + 10; // 10-100%
        onProgress(progress);
      }
    } else {
      onProgress(100);
    }

    // Get the actual export data
    return await exportDirectCSV(batchResult);
  }

  private async generateCSV(
    exportData: { headers: string[]; rows: any[][] },
    downloadId: string,
    onProgress?: (processed: number, total: number, stage: string) => void
  ): Promise<DownloadResult> {
    onProgress?.(70, 100, 'Formatting CSV data');

    if (this.isCancelled(downloadId)) {
      return { success: false, error: 'Download cancelled' };
    }

    const csvContent = [
      exportData.headers.join(','),
      ...exportData.rows.map(row => 
        row.map(cell => {
          const value = cell || '';
          return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    onProgress?.(90, 100, 'Creating download file');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `payee_results_${timestamp}.csv`;

    return { success: true, blob, filename };
  }

  private async generateExcel(
    exportData: { headers: string[]; rows: any[][] },
    downloadId: string,
    onProgress?: (processed: number, total: number, stage: string) => void
  ): Promise<DownloadResult> {
    onProgress?.(70, 100, 'Converting to Excel format');

    if (this.isCancelled(downloadId)) {
      return { success: false, error: 'Download cancelled' };
    }

    // Convert to object format for Excel
    const excelData = exportData.rows.map(row => {
      const obj: any = {};
      exportData.headers.forEach((header, headerIndex) => {
        obj[header] = row[headerIndex] || '';
      });
      return obj;
    });

    onProgress?.(85, 100, 'Creating Excel workbook');

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results");

    onProgress?.(95, 100, 'Finalizing Excel file');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `payee_results_${timestamp}.xlsx`;

    return { success: true, blob, filename };
  }

  cancelDownload(downloadId: string) {
    console.log(`[DOWNLOAD PROCESSOR] Cancelling download ${downloadId}`);
    this.cancelledDownloads.add(downloadId);
  }

  private isCancelled(downloadId: string): boolean {
    return this.cancelledDownloads.has(downloadId);
  }
}

export const backgroundDownloadProcessor = new BackgroundDownloadProcessor();
