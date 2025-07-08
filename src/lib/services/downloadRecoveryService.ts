import { supabase } from '@/integrations/supabase/client';
import { BatchJob, getBatchJobResults } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification } from '@/lib/types';
import { processEnhancedBatchResults } from '@/services/batchProcessor/enhancedProcessor';
import { saveClassificationResultsWithValidation } from '@/lib/database/enhancedClassificationService';
import { withDatabaseRetry } from '@/lib/database/connectionManager';

export interface DownloadRecoveryResult {
  success: boolean;
  error?: string;
  processedCount?: number;
  savedCount?: number;
  jobId: string;
}

/**
 * Service to handle download failures by processing and saving missing results
 */
export class DownloadRecoveryService {
  
  /**
   * Check if a completed job has saved classification results
   */
  static async hasStoredResults(jobId: string): Promise<boolean> {
    try {
      const { data, error } = await withDatabaseRetry(
        async () => {
          return await supabase
            .from('payee_classifications')
            .select('id')
            .eq('batch_id', jobId)
            .limit(1);
        },
        'high'
      );
      
      if (error) {
        console.error(`[DOWNLOAD RECOVERY] Error checking stored results for job ${jobId}:`, error);
        return false;
      }
      
      const hasResults = data && data.length > 0;
      console.log(`[DOWNLOAD RECOVERY] Job ${jobId} has stored results: ${hasResults}`);
      return hasResults;
      
    } catch (error) {
      console.error(`[DOWNLOAD RECOVERY] Failed to check stored results for job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Recover missing results for a completed job
   */
  static async recoverJobResults(job: BatchJob): Promise<DownloadRecoveryResult> {
    console.log(`[DOWNLOAD RECOVERY] Starting recovery for job ${job.id}`);
    
    try {
      // Step 1: Check if job is actually completed
      if (job.status !== 'completed') {
        throw new Error(`Job ${job.id} is not completed (status: ${job.status})`);
      }

      // Step 2: Reconstruct PayeeRowData from batch_jobs table
      const payeeRowData = await this.reconstructPayeeRowData(job.id);
      if (!payeeRowData) {
        throw new Error(`Failed to reconstruct payee data for job ${job.id}`);
      }

      console.log(`[DOWNLOAD RECOVERY] Reconstructed data for ${payeeRowData.uniquePayeeNames.length} unique payees`);

      // Step 3: Download results from OpenAI
      console.log(`[DOWNLOAD RECOVERY] Downloading results from OpenAI for job ${job.id}`);
      const rawResults = await getBatchJobResults(job, payeeRowData.uniquePayeeNames);
      
      if (!rawResults || rawResults.length === 0) {
        throw new Error(`No results found from OpenAI for job ${job.id}`);
      }

      console.log(`[DOWNLOAD RECOVERY] Retrieved ${rawResults.length} raw results from OpenAI`);

      // Step 4: Process results through enhanced pipeline
      console.log(`[DOWNLOAD RECOVERY] Processing results through enhanced pipeline`);
      const { finalClassifications } = await processEnhancedBatchResults({
        rawResults: rawResults.map(r => ({ result: r })),
        uniquePayeeNames: payeeRowData.uniquePayeeNames,
        payeeData: payeeRowData,
        job
      });

      console.log(`[DOWNLOAD RECOVERY] Processed ${finalClassifications.length} final classifications`);

      // Step 5: Save to database with validation
      console.log(`[DOWNLOAD RECOVERY] Saving results to database for job ${job.id}`);
      const saveStats = await saveClassificationResultsWithValidation(finalClassifications, job.id);
      
      if (saveStats.sicValidationErrors.length > 0) {
        console.warn(`[DOWNLOAD RECOVERY] Save completed with ${saveStats.sicValidationErrors.length} warnings:`, saveStats.sicValidationErrors);
      }

      console.log(`[DOWNLOAD RECOVERY] ✅ Successfully recovered job ${job.id}: processed ${finalClassifications.length}, saved ${saveStats.totalSaved}`);

      return {
        success: true,
        processedCount: finalClassifications.length,
        savedCount: saveStats.totalSaved,
        jobId: job.id
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[DOWNLOAD RECOVERY] ❌ Failed to recover job ${job.id}:`, error);
      
      return {
        success: false,
        error: errorMessage,
        jobId: job.id
      };
    }
  }

  /**
   * Reconstruct PayeeRowData from stored batch job data
   */
  private static async reconstructPayeeRowData(jobId: string): Promise<PayeeRowData | null> {
    try {
      const { data, error } = await withDatabaseRetry(
        async () => {
          return await supabase
            .from('batch_jobs')
            .select('unique_payee_names, original_file_data, row_mappings, file_name, file_headers, selected_payee_column')
            .eq('id', jobId)
            .single();
        },
        'high'
      );

      if (error || !data) {
        console.error(`[DOWNLOAD RECOVERY] Failed to fetch job data for ${jobId}:`, error);
        return null;
      }

      console.log(`[DOWNLOAD RECOVERY] Found batch job data for ${jobId}`);

      // Type-safe extraction with validation
      const uniquePayeeNames = Array.isArray(data.unique_payee_names) ? data.unique_payee_names as string[] : [];
      const originalFileData = Array.isArray(data.original_file_data) ? data.original_file_data as any[] : [];
      const rowMappings = Array.isArray(data.row_mappings) ? data.row_mappings as any[] : [];

      if (uniquePayeeNames.length === 0) {
        console.error(`[DOWNLOAD RECOVERY] No unique payee names found for job ${jobId}`);
        return null;
      }

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

    } catch (error) {
      console.error(`[DOWNLOAD RECOVERY] Error reconstructing payee data for job ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Diagnose and fix download issues for multiple jobs
   */
  static async diagnoseAndFixJobs(jobIds: string[]): Promise<DownloadRecoveryResult[]> {
    console.log(`[DOWNLOAD RECOVERY] Diagnosing ${jobIds.length} jobs for download issues`);
    
    const results: DownloadRecoveryResult[] = [];
    
    for (const jobId of jobIds) {
      try {
        // Get job info
        const { data: jobData, error } = await withDatabaseRetry(
          async () => {
            return await supabase
              .from('batch_jobs')
              .select('*')
              .eq('id', jobId)
              .single();
          },
          'medium'
        );

        if (error || !jobData) {
          results.push({
            success: false,
            error: `Job ${jobId} not found in database`,
            jobId
          });
          continue;
        }

        if (jobData.status !== 'completed') {
          results.push({
            success: false,
            error: `Job ${jobId} is not completed (status: ${jobData.status})`,
            jobId
          });
          continue;
        }

        // Check if has stored results
        const hasStored = await this.hasStoredResults(jobId);
        
        if (hasStored) {
          console.log(`[DOWNLOAD RECOVERY] Job ${jobId} already has stored results, skipping`);
          results.push({
            success: true,
            processedCount: 0,
            savedCount: 0,
            jobId
          });
          continue;
        }

        // Attempt recovery
        const job = {
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

        const result = await this.recoverJobResults(job);
        results.push(result);

        // Add delay between jobs to prevent overwhelming the system
        if (jobIds.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          jobId
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`[DOWNLOAD RECOVERY] Completed diagnosis: ${successful} successful, ${failed} failed`);
    
    return results;
  }
}