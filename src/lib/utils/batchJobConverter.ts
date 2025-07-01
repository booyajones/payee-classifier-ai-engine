
import { BatchJob } from '@/lib/openai/trueBatchAPI';

export const convertToBatchJob = (jobData: any): BatchJob => {
  // Safely parse metadata
  let parsedMetadata: { payee_count: number; description: string } | undefined;
  
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
};
