import { EnhancedFileGenerationService } from './enhancedFileGenerationService';
import { AutomaticResultProcessor } from './automaticResultProcessor';
import { supabase } from '@/integrations/supabase/client';
import { BatchJob } from '@/lib/openai/trueBatchAPI';

/**
 * Manual trigger service to fix completed jobs without files
 */
export class ManualFileGenerationTrigger {
  
  /**
   * Process all completed jobs that don't have files or results
   */
  static async fixAllCompletedJobs(): Promise<void> {
    console.log('[MANUAL TRIGGER] Starting manual fix for all completed jobs');
    
    try {
      // Get all completed jobs without files
      const { data: jobs, error } = await supabase
        .from('batch_jobs')
        .select('*')
        .eq('status', 'completed')
        .or('csv_file_url.is.null,excel_file_url.is.null')
        .gt('request_counts_completed', 0);

      if (error) {
        console.error('[MANUAL TRIGGER] Error fetching completed jobs:', error);
        return;
      }

      if (!jobs || jobs.length === 0) {
        console.log('[MANUAL TRIGGER] No completed jobs found needing processing');
        return;
      }

      console.log(`[MANUAL TRIGGER] Found ${jobs.length} completed jobs needing processing`);

      // Process each job
      for (const jobData of jobs) {
        try {
          console.log(`[MANUAL TRIGGER] Processing job ${jobData.id}`);
          
          // Convert to BatchJob format
          const batchJob = this.convertToBatchJob(jobData);
          
          // First, ensure results are processed and stored
          const hasResults = await AutomaticResultProcessor.hasPreProcessedResults(jobData.id);
          
          if (!hasResults) {
            console.log(`[MANUAL TRIGGER] Processing results for job ${jobData.id}`);
            const success = await AutomaticResultProcessor.processCompletedBatch(batchJob);
            if (!success) {
              console.error(`[MANUAL TRIGGER] Failed to process results for job ${jobData.id}`);
              continue;
            }
          } else {
            console.log(`[MANUAL TRIGGER] Results already exist for job ${jobData.id}`);
          }
          
          // Then generate download files
          console.log(`[MANUAL TRIGGER] Generating files for job ${jobData.id}`);
          const fileResult = await EnhancedFileGenerationService.processCompletedJob(batchJob);
          
          if (fileResult.success) {
            console.log(`[MANUAL TRIGGER] Successfully generated files for job ${jobData.id}`);
          } else {
            console.error(`[MANUAL TRIGGER] Failed to generate files for job ${jobData.id}:`, fileResult.error);
          }
          
          // Small delay between jobs to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`[MANUAL TRIGGER] Error processing job ${jobData.id}:`, error);
        }
      }
      
      console.log('[MANUAL TRIGGER] Manual fix completed');
      
    } catch (error) {
      console.error('[MANUAL TRIGGER] Error in manual fix process:', error);
    }
  }
  
  /**
   * Convert database job data to BatchJob format
   */
  private static convertToBatchJob(jobData: any): BatchJob {
    let parsedMetadata;
    if (jobData.metadata) {
      try {
        const metadataValue = typeof jobData.metadata === 'string' 
          ? JSON.parse(jobData.metadata) 
          : jobData.metadata;
        
        parsedMetadata = {
          payee_count: metadataValue?.payee_count || 0,
          description: metadataValue?.description || 'Payee classification batch'
        };
      } catch (error) {
        parsedMetadata = {
          payee_count: 0,
          description: 'Payee classification batch'
        };
      }
    }

    return {
      id: jobData.id,
      status: 'completed',
      created_at: jobData.created_at_timestamp,
      request_counts: {
        total: jobData.request_counts_total,
        completed: jobData.request_counts_completed,
        failed: jobData.request_counts_failed
      },
      completed_at: jobData.completed_at_timestamp,
      metadata: parsedMetadata,
      output_file_id: jobData.output_file_id || undefined
    };
  }
}