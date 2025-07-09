import { supabase } from '@/integrations/supabase/client';
import { AutomaticResultProcessor } from './automaticResultProcessor';
import { BatchJob } from '@/lib/openai/trueBatchAPI';

export class EmergencyResultRecovery {
  /**
   * Process all completed batch jobs that have no classification results
   */
  static async processOrphanedJobs(): Promise<{
    processed: number;
    failed: number;
    errors: string[];
  }> {
    console.log('[EMERGENCY RECOVERY] Starting orphaned job recovery...');
    
    try {
      // Find all completed jobs with no classification results
      const { data: orphanedJobs, error } = await supabase
        .from('batch_jobs')
        .select(`
          id,
          status,
          output_file_id,
          request_counts_total,
          request_counts_completed,
          original_file_data,
          row_mappings,
          unique_payee_names,
          selected_payee_column,
          created_at_timestamp,
          app_created_at
        `)
        .eq('status', 'completed')
        .not('output_file_id', 'is', null);

      if (error) {
        console.error('[EMERGENCY RECOVERY] Failed to fetch orphaned jobs:', error);
        return { processed: 0, failed: 0, errors: [error.message] };
      }

      if (!orphanedJobs || orphanedJobs.length === 0) {
        console.log('[EMERGENCY RECOVERY] No orphaned jobs found');
        return { processed: 0, failed: 0, errors: [] };
      }

      console.log(`[EMERGENCY RECOVERY] Found ${orphanedJobs.length} completed jobs to check`);

      // Check which ones actually need processing (no classification results)
      const jobsNeedingProcessing: BatchJob[] = [];
      
      for (const job of orphanedJobs) {
        const { data: existingResults, error: checkError } = await supabase
          .from('payee_classifications')
          .select('id')
          .eq('batch_id', job.id)
          .limit(1);

        if (checkError) {
          console.warn(`[EMERGENCY RECOVERY] Error checking results for job ${job.id}:`, checkError);
          continue;
        }

        if (!existingResults || existingResults.length === 0) {
          // Transform database row to BatchJob format
          const batchJob: BatchJob = {
            id: job.id,
            status: job.status as any,
            created_at: job.created_at_timestamp,
            request_counts: {
              total: job.request_counts_total,
              completed: job.request_counts_completed,
              failed: 0
            },
            output_file_id: job.output_file_id,
            metadata: {
              payee_count: job.unique_payee_names?.length || 0,
              description: `Emergency recovery job for ${job.id}`,
              job_name: `Recovery-${job.id.substring(0, 8)}`
            }
          };
          jobsNeedingProcessing.push(batchJob);
        }
      }

      console.log(`[EMERGENCY RECOVERY] ${jobsNeedingProcessing.length} jobs need result processing`);

      let processed = 0;
      let failed = 0;
      const errors: string[] = [];

      // Process each orphaned job
      for (const job of jobsNeedingProcessing) {
        try {
          console.log(`[EMERGENCY RECOVERY] Processing job ${job.id}...`);
          
          const success = await AutomaticResultProcessor.processCompletedBatch(job);
          
          if (success) {
            processed++;
            console.log(`[EMERGENCY RECOVERY] Successfully processed job ${job.id}`);
          } else {
            failed++;
            errors.push(`Failed to process job ${job.id} - processor returned false`);
          }
        } catch (error) {
          failed++;
          const errorMsg = `Failed to process job ${job.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`[EMERGENCY RECOVERY] ${errorMsg}`, error);
        }
      }

      console.log(`[EMERGENCY RECOVERY] Complete: ${processed} processed, ${failed} failed`);
      
      return {
        processed,
        failed,
        errors
      };
    } catch (error) {
      console.error('[EMERGENCY RECOVERY] Emergency recovery failed:', error);
      return {
        processed: 0,
        failed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Check if a specific job has results and process if needed
   */
  static async ensureJobHasResults(jobId: string): Promise<boolean> {
    try {
      // Check if job already has results
      const hasResults = await AutomaticResultProcessor.hasPreProcessedResults(jobId);
      if (hasResults) {
        return true;
      }

      // Get the job details
      const { data: job, error } = await supabase
        .from('batch_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('status', 'completed')
        .not('output_file_id', 'is', null)
        .single();

      if (error || !job) {
        console.warn(`[EMERGENCY RECOVERY] Job ${jobId} not found or not ready for processing`);
        return false;
      }

      // Process the job
      console.log(`[EMERGENCY RECOVERY] Processing individual job ${jobId}...`);
      const batchJob: BatchJob = {
        id: job.id,
        status: job.status as any,
        created_at: job.created_at_timestamp,
        request_counts: {
          total: job.request_counts_total,
          completed: job.request_counts_completed,
          failed: job.request_counts_failed || 0
        },
        output_file_id: job.output_file_id,
        metadata: {
          payee_count: job.unique_payee_names?.length || 0,
          description: `Emergency recovery job for ${job.id}`,
          job_name: `Recovery-${job.id.substring(0, 8)}`
        }
      };
      return await AutomaticResultProcessor.processCompletedBatch(batchJob);
    } catch (error) {
      console.error(`[EMERGENCY RECOVERY] Failed to ensure job ${jobId} has results:`, error);
      return false;
    }
  }
}