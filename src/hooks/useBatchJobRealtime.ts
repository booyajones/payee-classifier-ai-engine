
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { emitBatchJobUpdate } from './batch/useBatchJobEventEmitter';

export const useBatchJobRealtime = (onJobUpdate: (job: BatchJob) => void) => {
  useEffect(() => {
    productionLogger.debug('[BATCH REALTIME] Setting up real-time subscription for batch_jobs table');
    
    const channel = supabase
      .channel('batch-jobs-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'batch_jobs'
        },
        (payload) => {
          productionLogger.debug('[BATCH REALTIME] Received batch job update:', payload);
          
          if (payload.new) {
            // Convert database format to BatchJob format
            const updatedJob: BatchJob = {
              id: payload.new.id,
              status: payload.new.status,
              output_file_id: payload.new.output_file_id,
              created_at: payload.new.created_at_timestamp,
              in_progress_at: payload.new.in_progress_at_timestamp,
              finalizing_at: payload.new.finalizing_at_timestamp,
              completed_at: payload.new.completed_at_timestamp,
              failed_at: payload.new.failed_at_timestamp,
              expired_at: payload.new.expired_at_timestamp,
              cancelled_at: payload.new.cancelled_at_timestamp,
              request_counts: {
                total: payload.new.request_counts_total || 0,
                completed: payload.new.request_counts_completed || 0,
                failed: payload.new.request_counts_failed || 0
              },
              metadata: payload.new.metadata || {},
              errors: payload.new.errors || {}
            };
            
            productionLogger.debug('[BATCH REALTIME] Calling onJobUpdate with real-time data');
            onJobUpdate(updatedJob);
            
            // Emit update event to refresh UI
            emitBatchJobUpdate();
          }
        }
      )
      .subscribe((status) => {
        productionLogger.debug('[BATCH REALTIME] Subscription status:', status);
      });

    return () => {
      productionLogger.debug('[BATCH REALTIME] Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [onJobUpdate]);
};
