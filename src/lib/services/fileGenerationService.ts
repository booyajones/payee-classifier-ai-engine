import { supabase } from '@/integrations/supabase/client';
import { BatchProcessingResult, PayeeClassification } from '@/lib/types';
import * as XLSX from 'xlsx';
import { mapResultsToOriginalRows } from '@/lib/rowMapping/resultMapper';

export class FileGenerationService {
  /**
   * Generate and store CSV and Excel files for a batch job
   */
  static async generateAndStoreFiles(
    jobId: string,
    batchResult: BatchProcessingResult
  ): Promise<{
    error: string | null;
    csvUrl?: string;
    excelUrl?: string;
    fileSizeBytes?: number;
  }> {
    try {
      console.log(`[PRE-GEN] Generating files for job ${jobId}`);

      // Generate CSV content
      const csvContent = this.generateCSVContent(
        batchResult.results,
        batchResult.originalFileData,
        (batchResult as any).rowMappings || []
      );
      const csvBlob = new Blob([csvContent], { type: 'text/csv' });

      // Generate Excel content
      const excelBlob = this.generateExcelContent(
        batchResult.results,
        batchResult.originalFileData,
        (batchResult as any).rowMappings || []
      );

      // Upload CSV to storage
      const csvFileName = `batch-${jobId}-results.csv`;
      const { data: csvUpload, error: csvError } = await supabase.storage
        .from('batch-results')
        .upload(`csv/${csvFileName}`, csvBlob, {
          contentType: 'text/csv',
          upsert: true
        });

      if (csvError) {
        throw new Error(`CSV upload failed: ${csvError.message}`);
      }

      // Upload Excel to storage
      const excelFileName = `batch-${jobId}-results.xlsx`;
      const { data: excelUpload, error: excelError } = await supabase.storage
        .from('batch-results')
        .upload(`excel/${excelFileName}`, excelBlob, {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          upsert: true
        });

      if (excelError) {
        throw new Error(`Excel upload failed: ${excelError.message}`);
      }

      // Get public URLs
      const { data: csvUrlData } = supabase.storage
        .from('batch-results')
        .getPublicUrl(`csv/${csvFileName}`);

      const { data: excelUrlData } = supabase.storage
        .from('batch-results')
        .getPublicUrl(`excel/${excelFileName}`);

      const fileSizeBytes = csvBlob.size + excelBlob.size;

      // Update batch job with file URLs
      const { error: updateError } = await supabase
        .from('batch_jobs')
        .update({
          csv_file_url: csvUrlData.publicUrl,
          excel_file_url: excelUrlData.publicUrl,
          file_size_bytes: fileSizeBytes,
          file_generated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (updateError) {
        console.error(`[PRE-GEN] Failed to update job ${jobId} with file URLs:`, updateError);
      }

      // Store file blobs directly in the database for fast download
      const csvBuffer = await csvBlob.arrayBuffer();
      const excelBuffer = await excelBlob.arrayBuffer();

      const { error: fileInsertError } = await supabase
        .from('batch_job_files')
        .upsert({
          job_id: jobId,
          csv_data: csvBuffer,
          excel_data: excelBuffer
        });

      if (fileInsertError) {
        console.error(`[PRE-GEN] Failed to store file blobs for job ${jobId}:`, fileInsertError);
      }

      console.log(`[PRE-GEN] Successfully generated files for job ${jobId}`);

      return {
        error: null,
        csvUrl: csvUrlData.publicUrl,
        excelUrl: excelUrlData.publicUrl,
        fileSizeBytes
      };

    } catch (error) {
      console.error(`[PRE-GEN] Error generating files for job ${jobId}:`, error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate CSV content from classification results
   */
  private static generateCSVContent(
    classifications: PayeeClassification[],
    originalFileData: any[],
    rowMappings: any[]
  ): string {
    if (!originalFileData || originalFileData.length === 0) {
      // Fallback: just export classifications
      const headers = ['Payee Name', 'Classification', 'Confidence', 'SIC Code', 'SIC Description', 'Reasoning'];
      const rows = classifications.map(c => [
        c.payeeName,
        c.result.classification,
        c.result.confidence.toString(),
        c.result.sicCode || '',
        c.result.sicDescription || '',
        c.result.reasoning
      ]);
      
      return [headers, ...rows].map(row => 
        row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')
      ).join('\n');
    }

    // Use row mappings to restore original order and columns
    if (!rowMappings || rowMappings.length === 0) {
      console.warn('[PRE-GEN] No row mappings provided, falling back to basic merge');
      const originalHeaders = Object.keys(originalFileData[0] || {});
      const enhancedHeaders = [
        ...originalHeaders,
        'AI_Classification',
        'AI_Confidence',
        'AI_SIC_Code',
        'AI_SIC_Description',
        'AI_Reasoning'
      ];

      // Create classification lookup
      const classificationMap = new Map();
      classifications.forEach(c => {
        classificationMap.set(c.payeeName, c);
      });

      const rows = originalFileData.map(row => {
        const payeeName = Object.values(row).find(val =>
          classifications.some(c => c.payeeName === val)
        ) as string;

        const classification = classificationMap.get(payeeName);

        return [
          ...originalHeaders.map(header => row[header] || ''),
          classification?.result.classification || '',
          classification?.result.confidence?.toString() || '',
          classification?.result.sicCode || '',
          classification?.result.sicDescription || '',
          classification?.result.reasoning || ''
        ];
      });

      return [enhancedHeaders, ...rows]
        .map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
        .join('\n');
    }

    const payeeRowData = {
      uniquePayeeNames: classifications.map(c => c.payeeName),
      uniqueNormalizedNames: classifications.map(c => c.payeeName),
      originalFileData,
      rowMappings,
      standardizationStats: {
        totalProcessed: classifications.length,
        changesDetected: 0,
        averageStepsPerName: 0,
        mostCommonSteps: []
      }
    };

    const mappedResults = mapResultsToOriginalRows(classifications, payeeRowData);

    const headers = Object.keys(mappedResults[0] || {});
    const rows = mappedResults.map(row => headers.map(h => row[h] ?? ''));

    return [headers, ...rows]
      .map(row => row.map(cell => `"${(cell ?? '').toString().replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  /**
   * Generate Excel content from classification results
   */
  private static generateExcelContent(
    classifications: PayeeClassification[],
    originalFileData: any[],
    rowMappings: any[]
  ): Blob {
    const workbook = XLSX.utils.book_new();

    // Create main results worksheet
    const csvContent = this.generateCSVContent(
      classifications,
      originalFileData,
      rowMappings
    );
    const rows = csvContent.split('\n').map(row => {
      const cells = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"' && (i === 0 || row[i-1] === ',')) {
          inQuotes = true;
        } else if (char === '"' && inQuotes && (i === row.length - 1 || row[i+1] === ',')) {
          inQuotes = false;
        } else if (char === ',' && !inQuotes) {
          cells.push(current.replace(/""/g, '"'));
          current = '';
        } else if (!(char === '"' && (i === 0 || row[i-1] === ',' || i === row.length - 1 || row[i+1] === ','))) {
          current += char;
        }
      }
      if (current) cells.push(current.replace(/""/g, '"'));
      return cells;
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');

    // Create summary worksheet
    const businessCount = classifications.filter(c => c.result.classification === 'Business').length;
    const individualCount = classifications.filter(c => c.result.classification === 'Individual').length;
    const avgConfidence = classifications.reduce((sum, c) => sum + c.result.confidence, 0) / classifications.length;

    const summaryData = [
      ['Summary', ''],
      ['Total Payees', classifications.length],
      ['Business Classifications', businessCount],
      ['Individual Classifications', individualCount],
      ['Average Confidence', Math.round(avgConfidence * 100) / 100],
      ['Generated At', new Date().toLocaleString()]
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    return new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
  }
}
