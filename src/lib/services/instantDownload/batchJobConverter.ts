import { BatchJob } from '@/lib/openai/trueBatchAPI';

/**
 * Utility to convert database job data to BatchJob format
 */
export class BatchJobConverter {
  /**
   * Convert database row to BatchJob format
   */
  static convertToBatchJob(jobData: any): BatchJob {
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
