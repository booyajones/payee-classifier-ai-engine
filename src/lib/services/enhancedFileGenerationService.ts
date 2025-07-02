
import { supabase } from '@/integrations/supabase/client';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { RetroactiveBatchProcessor } from './retroactiveBatchProcessor';
import { logger } from '@/lib/logging/logger';
import { generateBatchIdentifier } from '@/lib/utils/batchIdentifierGenerator';

export class EnhancedFileGenerationService {
  private static context = 'ENHANCED_FILE_GENERATION';
  private static maxRetries = 3;
  private static retryDelay = 2000; // 2 seconds

  /**
   * Process a newly completed job with enhanced reliability
   */
  static async processCompletedJob(job: BatchJob): Promise<{
    success: boolean;
    error?: string;
    fileUrls?: { csvUrl?: string; excelUrl?: string };
  }> {
    logger.info(`Enhanced processing for completed job ${job.id}`, undefined, this.context);

    // Quick check if files already exist
    const existingFiles = await this.checkExistingFiles(job.id);
    if (existingFiles.csvUrl && existingFiles.excelUrl) {
      logger.info(`Files already exist for job ${job.id}`, undefined, this.context);
      return {
        success: true,
        fileUrls: existingFiles
      };
    }

    // Generate files with retry logic
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(`File generation attempt ${attempt}/${this.maxRetries} for job ${job.id}`, undefined, this.context);
        
        const result = await RetroactiveBatchProcessor.processCompletedJob(job);
        
        if (result.success && result.fileUrls) {
          logger.info(`Successfully generated files for job ${job.id} on attempt ${attempt}`, undefined, this.context);
          return {
            success: true,
            fileUrls: result.fileUrls
          };
        }
        
        if (attempt < this.maxRetries) {
          logger.warn(`Attempt ${attempt} failed for job ${job.id}, retrying...`, { error: result.error }, this.context);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      } catch (error) {
        logger.error(`Generation attempt ${attempt} failed for job ${job.id}`, { error }, this.context);
        
        if (attempt < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }

    logger.error(`All generation attempts failed for job ${job.id}`, undefined, this.context);
    return {
      success: false,
      error: 'File generation failed after multiple attempts'
    };
  }

  /**
   * Check if files already exist for a job
   */
  private static async checkExistingFiles(jobId: string): Promise<{
    csvUrl?: string;
    excelUrl?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('batch_jobs')
        .select('csv_file_url, excel_file_url')
        .eq('id', jobId)
        .single();

      if (error || !data) {
        return {};
      }

      return {
        csvUrl: data.csv_file_url || undefined,
        excelUrl: data.excel_file_url || undefined
      };
    } catch (error) {
      logger.error(`Error checking existing files for job ${jobId}`, { error }, this.context);
      return {};
    }
  }

  /**
   * Get file status for a job
   */
  static async getFileStatus(jobId: string): Promise<{
    filesReady: boolean;
    csvUrl?: string;
    excelUrl?: string;
    fileGeneratedAt?: string;
    fileSizeBytes?: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('batch_jobs')
        .select('csv_file_url, excel_file_url, file_generated_at, file_size_bytes')
        .eq('id', jobId)
        .single();

      if (error || !data) {
        return { filesReady: false };
      }

      const filesReady = Boolean(data.csv_file_url && data.excel_file_url);

      return {
        filesReady,
        csvUrl: data.csv_file_url || undefined,
        excelUrl: data.excel_file_url || undefined,
        fileGeneratedAt: data.file_generated_at || undefined,
        fileSizeBytes: data.file_size_bytes || undefined
      };
    } catch (error) {
      logger.error(`Error getting file status for job ${jobId}`, { error }, this.context);
      return { filesReady: false };
    }
  }

  /**
   * Force regenerate files for a job (manual recovery)
   */
  static async regenerateFiles(jobId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    logger.info(`Manual file regeneration requested for job ${jobId}`, undefined, this.context);

    try {
      // Get job data
      const { data: jobData, error } = await supabase
        .from('batch_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error || !jobData) {
        throw new Error('Failed to fetch job data');
      }

      // Convert to BatchJob format
      const batchJob = this.convertToBatchJob(jobData);
      
      // Process with enhanced service
      const result = await this.processCompletedJob(batchJob);
      
      return {
        success: result.success,
        error: result.error
      };
    } catch (error) {
      logger.error(`Manual regeneration failed for job ${jobId}`, { error }, this.context);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
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
      metadata: parsedMetadata,
      errors: jobData.errors ? (typeof jobData.errors === 'string' ? JSON.parse(jobData.errors) : jobData.errors) : undefined,
      output_file_id: jobData.output_file_id || undefined
    };
  }
}
