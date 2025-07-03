

import { supabase } from '@/integrations/supabase/client';
import { BatchJob, getBatchJobResults } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData, RowMapping } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { processEnhancedBatchResults } from '@/services/batchProcessor';
import { saveClassificationResultsWithValidation } from '@/lib/database/enhancedClassificationService';
import { AutomaticResultProcessor } from './automaticResultProcessor';
import { EnhancedFileGenerationService } from './enhancedFileGenerationService';

export interface RetroactiveProcessingResult {
  jobId: string;
  success: boolean;
  error?: string;
  fileUrls?: {
    csvUrl: string;
    excelUrl: string;
  };
  processedCount?: number;
  fileSizeBytes?: number;
}

export class RetroactiveBatchProcessor {
  private static context = 'RETROACTIVE_PROCESSOR';

  /**
   * Process a completed batch job to generate pre-generated files
   */
  static async processCompletedJob(
    job: BatchJob,
    onProgress?: (processed: number, total: number, stage: string) => void
  ): Promise<RetroactiveProcessingResult> {
    console.log(`Starting retroactive processing for job ${job.id}`);

    try {
      // Step 1: Reconstruct PayeeRowData from database
      onProgress?.(0, 100, 'Reconstructing job data...');
      const payeeRowData = await this.reconstructPayeeRowData(job.id);

      if (!payeeRowData) {
        throw new Error('Failed to reconstruct payee data from database');
      }

      // Step 2: Download results from OpenAI
      onProgress?.(25, 100, 'Downloading OpenAI results...');
      const rawResults = await getBatchJobResults(job, payeeRowData.uniquePayeeNames);

      if (!rawResults || rawResults.length === 0) {
        throw new Error('No results found from OpenAI batch job');
      }

      // Step 3: Process results through enhanced pipeline
      onProgress?.(50, 100, 'Processing classifications...');
      const { finalClassifications, summary } = await processEnhancedBatchResults({
        rawResults,
        uniquePayeeNames: payeeRowData.uniquePayeeNames,
        payeeData: payeeRowData,
        job,
        onProgress: (processed, total) => {
          const progressPercent = 50 + (processed / total) * 25;
          onProgress?.(progressPercent, 100, `Processing ${processed}/${total} results...`);
        }
      });

      // Step 4: Save to database
      onProgress?.(75, 100, 'Saving to database...');
      await saveClassificationResultsWithValidation(finalClassifications, job.id);

      // Step 5: Generate pre-generated files
      onProgress?.(85, 100, 'Generating downloadable files...');
      const batchResult: BatchProcessingResult = {
        results: finalClassifications,
        successCount: finalClassifications.length,
        failureCount: 0,
        originalFileData: payeeRowData.originalFileData
      };

      // Import and use the actual file generation service
      const { PreGeneratedFileService } = await import('./preGeneratedFileService');
      const fileResult = await PreGeneratedFileService.generateAndStoreFiles(job.id, batchResult);

      if (fileResult.error) {
        throw new Error(`File generation failed: ${fileResult.error}`);
      }

      onProgress?.(100, 100, 'Complete!');

      console.log(`Successfully processed job ${job.id}`, {
        processedCount: finalClassifications.length,
        fileUrls: fileResult
      });

      return {
        jobId: job.id,
        success: true,
        fileUrls: {
          csvUrl: fileResult.csvUrl!,
          excelUrl: fileResult.excelUrl!
        },
        processedCount: finalClassifications.length,
        fileSizeBytes: fileResult.fileSizeBytes
      };

    } catch (error) {
      console.error(`Failed to process job ${job.id}`, { error });
      return {
        jobId: job.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Reconstruct PayeeRowData from database storage
   */
  private static async reconstructPayeeRowData(jobId: string): Promise<PayeeRowData | null> {
    const { data, error } = await supabase
      .from('batch_jobs')
      .select('unique_payee_names, original_file_data, row_mappings, file_name, file_headers, selected_payee_column')
      .eq('id', jobId)
      .single();

    if (error || !data) {
      console.error(`Failed to fetch job data for ${jobId}`, { error });
      return null;
    }

    // Type guard functions
    const isStringArray = (value: any): value is string[] => {
      return Array.isArray(value) && value.every(item => typeof item === 'string');
    };

    const isRowMappingArray = (value: any): value is RowMapping[] => {
      return Array.isArray(value) && value.every(item => 
        typeof item === 'object' && 
        item !== null &&
        typeof item.originalRowIndex === 'number' &&
        typeof item.payeeName === 'string' &&
        typeof item.normalizedPayeeName === 'string' &&
        typeof item.uniquePayeeIndex === 'number'
      );
    };

    const isObjectArray = (value: any): value is any[] => {
      return Array.isArray(value);
    };

    // Safely extract and validate the data
    const uniquePayeeNames = isStringArray(data.unique_payee_names) ? data.unique_payee_names : [];
    const rowMappings = isRowMappingArray(data.row_mappings) ? data.row_mappings : [];
    const originalFileData = isObjectArray(data.original_file_data) ? data.original_file_data : [];

    return {
      uniquePayeeNames,
      uniqueNormalizedNames: uniquePayeeNames,
      originalFileData,
      rowMappings,
      standardizationStats: {
        totalProcessed: uniquePayeeNames.length,
        changesDetected: 0,
        averageStepsPerName: 0,
        mostCommonSteps: []
      }
    };
  }

  /**
   * Process multiple completed jobs in sequence
   */
  static async processBulkJobs(
    jobs: BatchJob[],
    onJobProgress?: (jobIndex: number, jobId: string, processed: number, total: number, stage: string) => void
  ): Promise<RetroactiveProcessingResult[]> {
    const results: RetroactiveProcessingResult[] = [];

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      console.log(`Processing job ${i + 1}/${jobs.length}: ${job.id}`);

      const result = await this.processCompletedJob(job, (processed, total, stage) => {
        onJobProgress?.(i, job.id, processed, total, stage);
      });

      results.push(result);

      // Small delay between jobs to prevent overwhelming the system
      if (i < jobs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Process all existing completed batch jobs that don't have pre-processed results
   */
  static async processExistingJobs(): Promise<{ processed: number; skipped: number; errors: number }> {
    console.log('[RETROACTIVE] Starting retroactive processing of existing batch jobs');
    
    try {
      // Get all completed batch jobs
      const { data: jobs, error } = await supabase
        .from('batch_jobs')
        .select('*')
        .eq('status', 'completed')
        .order('completed_at_timestamp', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch completed jobs: ${error.message}`);
      }

      if (!jobs || jobs.length === 0) {
        console.log('[RETROACTIVE] No completed jobs found');
        return { processed: 0, skipped: 0, errors: 0 };
      }

      console.log(`[RETROACTIVE] Found ${jobs.length} completed jobs to check`);
      
      let processed = 0;
      let skipped = 0;
      let errors = 0;

      for (const jobData of jobs) {
        try {
          // Check if this job already has pre-processed results
          const hasPreProcessed = await AutomaticResultProcessor.hasPreProcessedResults(jobData.id);
          
          if (hasPreProcessed) {
            console.log(`[RETROACTIVE] Skipping job ${jobData.id} - already has pre-processed results`);
            skipped++;
            continue;
          }

          console.log(`[RETROACTIVE] Processing job ${jobData.id}`);
          
          // Process the results automatically
          const batchJob = {
            id: jobData.id,
            status: jobData.status,
            created_at: jobData.created_at_timestamp,
            request_counts: {
              total: jobData.request_counts_total,
              completed: jobData.request_counts_completed,
              failed: jobData.request_counts_failed
            },
            metadata: jobData.metadata,
            output_file_id: jobData.output_file_id
          } as BatchJob;
          
          const success = await AutomaticResultProcessor.processCompletedBatch(batchJob);
          
          if (success) {
            // Also generate files for instant downloads
            await EnhancedFileGenerationService.processCompletedJob(batchJob);
            processed++;
            console.log(`[RETROACTIVE] Successfully processed job ${jobData.id}`);
          } else {
            errors++;
            console.error(`[RETROACTIVE] Failed to process job ${jobData.id}`);
          }
          
        } catch (error) {
          errors++;
          console.error(`[RETROACTIVE] Error processing job ${jobData.id}:`, error);
        }
      }

      console.log(`[RETROACTIVE] Completed: processed=${processed}, skipped=${skipped}, errors=${errors}`);
      
      return { processed, skipped, errors };
      
    } catch (error) {
      console.error('[RETROACTIVE] Failed to process existing jobs:', error);
      throw error;
    }
  }

  /**
   * Check if a specific job has instant download available
   */
  static async hasInstantDownload(jobId: string): Promise<boolean> {
    try {
      // Check if it has pre-processed results
      const hasPreProcessed = await AutomaticResultProcessor.hasPreProcessedResults(jobId);
      
      if (hasPreProcessed) {
        return true;
      }

      // Check if it has pre-generated files
      const { data: job } = await supabase
        .from('batch_jobs')
        .select('csv_file_url, excel_file_url')
        .eq('id', jobId)
        .single();

      return !!(job?.csv_file_url || job?.excel_file_url);
      
    } catch (error) {
      console.error(`[RETROACTIVE] Error checking instant download for job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Get download type for UI display
   */
  static async getDownloadType(jobId: string): Promise<'instant' | 'processing' | 'unavailable'> {
    try {
      const { data: job } = await supabase
        .from('batch_jobs')
        .select('status, csv_file_url, excel_file_url')
        .eq('id', jobId)
        .single();

      if (!job) {
        return 'unavailable';
      }

      if (job.status !== 'completed') {
        return 'unavailable';
      }

      // Check for instant download capability
      const hasInstant = await this.hasInstantDownload(jobId);
      
      return hasInstant ? 'instant' : 'processing';
      
    } catch (error) {
      console.error(`[RETROACTIVE] Error getting download type for job ${jobId}:`, error);
      return 'unavailable';
    }
  }
}

