import { supabase } from '@/integrations/supabase/client';
import { AutomaticResultProcessor } from '../automaticResultProcessor';
import { EnhancedFileGenerationService } from '../enhancedFileGenerationService';
import { logger } from '@/lib/logging/logger';
import { InstantDownloadChecker } from './instantDownloadChecker';
import { BatchJobConverter } from './batchJobConverter';

/**
 * Result type for single job operations
 */
export interface SingleJobResult {
  success: boolean;
  error?: string;
}

/**
 * Service for ensuring individual jobs are ready for instant download
 */
export class SingleJobProcessor {
  private static context = 'SINGLE_JOB_PROCESSOR';

  /**
   * Ensure a specific job has instant download ready
   */
  static async ensureJobReady(jobId: string): Promise<SingleJobResult> {
    try {
      logger.info(`Ensuring job ${jobId} is ready for instant download`, undefined, this.context);

      const downloadStatus = await InstantDownloadChecker.hasInstantDownload(jobId);
      
      if (downloadStatus.status === 'instant') {
        logger.info(`Job ${jobId} already ready`, undefined, this.context);
        return { success: true };
      }

      if (downloadStatus.status === 'unavailable') {
        return { success: false, error: 'Job is not completed or not found' };
      }

      // Get job data
      const { data: jobData, error } = await supabase
        .from('batch_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error || !jobData) {
        return { success: false, error: 'Job not found' };
      }

      // Convert to BatchJob format
      const batchJob = BatchJobConverter.convertToBatchJob(jobData);

      // Process if needed
      if (!downloadStatus.hasResults) {
        const resultSuccess = await AutomaticResultProcessor.processCompletedBatch(batchJob);
        if (!resultSuccess) {
          return { success: false, error: 'Failed to process results' };
        }
      }

      if (!downloadStatus.hasFiles) {
        const fileResult = await EnhancedFileGenerationService.processCompletedJob(batchJob);
        if (!fileResult.success) {
          return { success: false, error: `Failed to generate files: ${fileResult.error}` };
        }
      }

      logger.info(`Job ${jobId} is now ready for instant download`, undefined, this.context);
      return { success: true };

    } catch (error) {
      logger.error(`Error ensuring job ${jobId} is ready`, { error }, this.context);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}