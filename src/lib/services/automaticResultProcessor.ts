import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { processDownloadResults, saveProcessedResults } from '@/hooks/batch/downloadProcessor';
import { supabase } from '@/integrations/supabase/client';
import { PayeeRowData } from '@/lib/rowMapping';

/**
 * Service for automatically processing and storing batch results when jobs complete
 * This eliminates the need for processing during downloads, making them instant
 */
export class AutomaticResultProcessor {
  
  /**
   * Process and store results for a completed batch job
   * This runs automatically when a job status changes to 'completed'
   */
  static async processCompletedBatch(batchJob: BatchJob): Promise<boolean> {
    try {
      console.log(`[AUTO PROCESSOR] Starting automatic processing for completed job ${batchJob.id}`);
      
      // Check if results already exist for this job to prevent duplicate processing
      const { data: existingResults, error: checkError } = await supabase
        .from('payee_classifications')
        .select('id')
        .eq('batch_id', batchJob.id)
        .limit(1);
        
      if (checkError) {
        console.error(`[AUTO PROCESSOR] Error checking existing results for job ${batchJob.id}:`, checkError);
        return false;
      }
      
      if (existingResults && existingResults.length > 0) {
        console.log(`[AUTO PROCESSOR] Results already exist for job ${batchJob.id} - skipping duplicate processing`);
        return true; // Already processed, consider it successful
      }
      
      // Get the payee data from the batch job
      const payeeData = await this.reconstructPayeeData(batchJob);
      if (!payeeData) {
        console.error(`[AUTO PROCESSOR] Could not reconstruct payee data for job ${batchJob.id}`);
        return false;
      }
      
      // Process the results (this downloads from OpenAI and processes classifications)
      const { finalClassifications } = await processDownloadResults(
        {
          job: batchJob,
          payeeData,
          uniquePayeeNames: payeeData.uniquePayeeNames,
          onJobComplete: () => {} // Not needed for automatic processing
        },
        (processed, total, percentage) => {
          console.log(`[AUTO PROCESSOR] Processing job ${batchJob.id}: ${processed}/${total} (${percentage}%)`);
        }
      );
      
      // Save results to database
      const saveResult = await saveProcessedResults(finalClassifications, batchJob.id);
      
      if (!saveResult.success) {
        console.error(`[AUTO PROCESSOR] Failed to save results for job ${batchJob.id}:`, saveResult.error);
        return false;
      }
      
      console.log(`[AUTO PROCESSOR] Successfully processed and saved ${finalClassifications.length} results for job ${batchJob.id}`);
      return true;
      
    } catch (error) {
      console.error(`[AUTO PROCESSOR] Error processing completed job ${batchJob.id}:`, error);
      return false;
    }
  }
  
  /**
   * Reconstruct PayeeRowData from stored batch job data
   */
  private static async reconstructPayeeData(batchJob: BatchJob): Promise<PayeeRowData | null> {
    try {
      // Get the batch job data from database with all required fields
      const { data: jobData, error } = await supabase
        .from('batch_jobs')
        .select('original_file_data, row_mappings, unique_payee_names, selected_payee_column')
        .eq('id', batchJob.id)
        .single();
        
      if (error || !jobData) {
        console.error(`[AUTO PROCESSOR] Error fetching job data for ${batchJob.id}:`, error);
        return null;
      }
      
      // Reconstruct the required PayeeRowData structure
      const rowMappings = jobData.row_mappings as any[];
      const uniquePayeeNames = jobData.unique_payee_names as string[];
      
      // Extract unique normalized names from row mappings
      const uniqueNormalizedNames = Array.from(new Set(
        rowMappings.map(mapping => mapping.normalizedPayeeName || mapping.payeeName || '')
      )).filter(name => name.length > 0);
      
      return {
        originalFileData: jobData.original_file_data as any[],
        rowMappings,
        uniquePayeeNames,
        uniqueNormalizedNames,
        standardizationStats: {
          totalProcessed: uniquePayeeNames.length,
          changesDetected: 0,
          averageStepsPerName: 0,
          mostCommonSteps: []
        },
        duplicateDetectionResults: undefined // Will be generated during processing
      };
      
    } catch (error) {
      console.error(`[AUTO PROCESSOR] Error reconstructing payee data for job ${batchJob.id}:`, error);
      return null;
    }
  }
  
  /**
   * Check if results have been pre-processed for a job
   */
  static async hasPreProcessedResults(jobId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('payee_classifications')
        .select('id')
        .eq('batch_id', jobId)
        .limit(1);
        
      if (error) {
        console.error(`[AUTO PROCESSOR] Error checking pre-processed results for job ${jobId}:`, error);
        return false;
      }
      
      return data && data.length > 0;
    } catch (error) {
      console.error(`[AUTO PROCESSOR] Error checking pre-processed results for job ${jobId}:`, error);
      return false;
    }
  }
  
  /**
   * Get pre-processed results for instant download
   */
  static async getPreProcessedResults(jobId: string) {
    try {
      const { data, error } = await supabase
        .from('payee_classifications')
        .select('*')
        .eq('batch_id', jobId)
        .order('payee_name');
        
      if (error) {
        console.error(`[AUTO PROCESSOR] Error fetching pre-processed results for job ${jobId}:`, error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error(`[AUTO PROCESSOR] Error fetching pre-processed results for job ${jobId}:`, error);
      return null;
    }
  }
}