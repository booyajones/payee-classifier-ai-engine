import { supabase } from '@/integrations/supabase/client';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { EnhancedFileGenerationService } from './enhancedFileGenerationService';
import { AutomaticResultProcessor } from './automaticResultProcessor';
import { productionLogger } from '@/lib/logging/productionLogger';

/**
 * Force file generation service for immediate processing
 */
export class ForceFileGenerationService {
  
  /**
   * Force generate files for a specific batch job immediately
   */
  static async forceGenerateFiles(jobId: string): Promise<{
    success: boolean;
    message: string;
    csvUrl?: string;
    excelUrl?: string;
  }> {
    try {
      productionLogger.info(`Force generating files for job ${jobId}`, undefined, 'FORCE_FILE_GEN');
      
      // Get the batch job data
      const { data: jobData, error } = await supabase
        .from('batch_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error || !jobData) {
        throw new Error(`Failed to fetch batch job: ${error?.message}`);
      }

      // Convert to BatchJob format
      const batchJob: BatchJob = {
        id: jobData.id,
        status: jobData.status as BatchJob['status'],
        created_at: jobData.created_at_timestamp,
        request_counts: {
          total: jobData.request_counts_total,
          completed: jobData.request_counts_completed,
          failed: jobData.request_counts_failed
        },
        in_progress_at: jobData.in_progress_at_timestamp,
        finalizing_at: jobData.finalizing_at_timestamp,
        completed_at: jobData.completed_at_timestamp,
        failed_at: jobData.failed_at_timestamp,
        expired_at: jobData.expired_at_timestamp,
        cancelled_at: jobData.cancelled_at_timestamp,
        metadata: jobData.metadata ? (typeof jobData.metadata === 'string' ? JSON.parse(jobData.metadata) : jobData.metadata) : undefined,
        errors: jobData.errors ? (typeof jobData.errors === 'string' ? JSON.parse(jobData.errors) : jobData.errors) : undefined,
        output_file_id: jobData.output_file_id || undefined
      };

      // Process results first
      await AutomaticResultProcessor.processCompletedBatch(batchJob);
      
      // Generate files immediately
      const fileResult = await EnhancedFileGenerationService.processCompletedJob(batchJob);

      if (!fileResult.success) {
        throw new Error(`File generation failed: ${fileResult.error}`);
      }

      // Get updated file URLs
      const { data: updatedData } = await supabase
        .from('batch_jobs')
        .select('csv_file_url, excel_file_url')
        .eq('id', jobId)
        .single();

      // Update queue status to completed
      await supabase
        .from('file_generation_queue')
        .upsert({
          batch_job_id: jobId,
          status: 'completed',
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'batch_job_id'
        });

      productionLogger.info(`Successfully force generated files for job ${jobId}`, undefined, 'FORCE_FILE_GEN');

      return {
        success: true,
        message: 'Files generated successfully',
        csvUrl: updatedData?.csv_file_url || undefined,
        excelUrl: updatedData?.excel_file_url || undefined
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      productionLogger.error(`Force file generation failed for job ${jobId}`, error, 'FORCE_FILE_GEN');
      
      return {
        success: false,
        message: `Force generation failed: ${errorMessage}`
      };
    }
  }

  /**
   * Force process all pending queue items
   */
  static async forceProcessAllPending(): Promise<{
    success: boolean;
    message: string;
    processedCount: number;
  }> {
    try {
      productionLogger.info('Force processing all pending queue items', undefined, 'FORCE_FILE_GEN');
      
      // Get all pending items
      const { data: pendingItems, error } = await supabase
        .from('file_generation_queue')
        .select('batch_job_id')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      
      if (error) {
        throw new Error(`Failed to fetch pending items: ${error.message}`);
      }
      
      if (!pendingItems || pendingItems.length === 0) {
        return {
          success: true,
          message: 'No pending items found',
          processedCount: 0
        };
      }
      
      let processedCount = 0;
      
      // Process each job
      for (const item of pendingItems) {
        try {
          const result = await this.forceGenerateFiles(item.batch_job_id);
          if (result.success) {
            processedCount++;
          }
          
          // Small delay to prevent overwhelming
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (itemError) {
          productionLogger.error(`Failed to force process job ${item.batch_job_id}`, itemError, 'FORCE_FILE_GEN');
        }
      }
      
      return {
        success: true,
        message: `Successfully processed ${processedCount} of ${pendingItems.length} pending items`,
        processedCount
      };
      
    } catch (error) {
      productionLogger.error('Force processing all pending failed', error, 'FORCE_FILE_GEN');
      return {
        success: false,
        message: `Force processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        processedCount: 0
      };
    }
  }
}