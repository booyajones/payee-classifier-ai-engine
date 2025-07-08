import { useEffect, useCallback } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { useBatchJobStore } from '@/stores/batchJobStore';
import { BatchJobLoader } from '@/lib/database/batchJobLoader';

interface UseJobStatusSyncProps {
  onJobUpdate: (job: BatchJob) => void;
}

export const useJobStatusSync = ({ onJobUpdate }: UseJobStatusSyncProps) => {
  const { jobs } = useBatchJobStore();

  // Manual sync function that can be called to force status sync
  const syncJobStatus = useCallback(async (jobId: string) => {
    try {
      console.log(`[STATUS SYNC] Manual sync for job ${jobId.substring(0, 8)}`);
      const dbJob = await BatchJobLoader.loadBatchJobById(jobId);
      if (dbJob) {
        onJobUpdate(dbJob);
        console.log(`[STATUS SYNC] Updated job ${jobId.substring(0, 8)} status to ${dbJob.status}`);
      }
    } catch (error) {
      console.error(`[STATUS SYNC] Error syncing job ${jobId.substring(0, 8)}:`, error);
    }
  }, [onJobUpdate]);

  // Sync all job statuses - for startup recovery
  const syncAllJobStatuses = useCallback(async () => {
    console.log('[STATUS SYNC] Starting full status sync for all jobs');
    
    for (const job of jobs) {
      // Only sync jobs that might have status issues
      if (['validating', 'in_progress', 'finalizing'].includes(job.status)) {
        await syncJobStatus(job.id);
        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('[STATUS SYNC] Full status sync completed');
  }, [jobs, syncJobStatus]);

  // Run status sync on startup (once when component mounts)
  useEffect(() => {
    if (jobs.length > 0) {
      // Run after a small delay to let the component settle
      const timer = setTimeout(() => {
        syncAllJobStatuses();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, []); // Only run once on mount

  return { syncJobStatus, syncAllJobStatuses };
};