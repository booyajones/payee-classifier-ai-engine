import { useEffect, useCallback } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { useBatchJobStore } from '@/stores/batchJobStore';
import { BatchJobLoader } from '@/lib/database/batchJobLoader';

interface UseJobStatusSyncProps {
  onJobUpdate: (job: BatchJob) => void;
}

export const useJobStatusSync = ({ onJobUpdate }: UseJobStatusSyncProps) => {
  const { jobs } = useBatchJobStore();

  // Manual sync function with enhanced job ID matching
  const syncJobStatus = useCallback(async (jobId: string) => {
    try {
      console.log(`[STATUS SYNC] Manual sync for job ${jobId.slice(-8)}`);
      
      // Try direct lookup first
      let dbJob = await BatchJobLoader.loadBatchJobById(jobId);
      
      // If not found and it's a short ID, search for matching long ID
      if (!dbJob && jobId.length <= 12) {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: jobs } = await supabase
          .from('batch_jobs')
          .select('*')
          .or(`id.eq.${jobId},id.ilike.%${jobId}%`)
          .order('app_created_at', { ascending: false })
          .limit(1);
        
        if (jobs && jobs.length > 0) {
          dbJob = jobs[0] as any;
          console.log(`[STATUS SYNC] Found job by pattern match: ${dbJob.id.slice(-8)}`);
        }
      }
      
      if (dbJob) {
        onJobUpdate(dbJob);
        console.log(`[STATUS SYNC] Updated job ${dbJob.id.slice(-8)} status to ${dbJob.status}`);
      } else {
        console.warn(`[STATUS SYNC] Job not found in database: ${jobId.slice(-8)}`);
      }
    } catch (error) {
      console.error(`[STATUS SYNC] Error syncing job ${jobId.slice(-8)}:`, error);
    }
  }, [onJobUpdate]);

  // Enhanced sync all with orphan detection
  const syncAllJobStatuses = useCallback(async () => {
    console.log('[STATUS SYNC] Starting full status sync for all jobs');
    
    // Get all jobs from database to check for mismatches
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: dbJobs } = await supabase
        .from('batch_jobs')
        .select('*')
        .order('app_created_at', { ascending: false })
        .limit(20);
      
      if (dbJobs) {
        // Update any jobs that exist in database but might be stale in UI
        for (const rawDbJob of dbJobs) {
          const uiJob = jobs.find(j => j.id === rawDbJob.id || j.id.includes(rawDbJob.id) || rawDbJob.id.includes(j.id));
          
          if (uiJob && (uiJob.status !== rawDbJob.status || 
                       uiJob.request_counts?.completed !== rawDbJob.request_counts_completed)) {
            console.log(`[STATUS SYNC] Updating stale UI job ${rawDbJob.id.slice(-8)}: ${uiJob.status} -> ${rawDbJob.status}`);
            
            // Use BatchJobLoader to properly convert the raw job data
            const properDbJob = await BatchJobLoader.loadBatchJobById(rawDbJob.id);
            if (properDbJob) {
              onJobUpdate(properDbJob);
            }
          }
        }
      }
    } catch (error) {
      console.error('[STATUS SYNC] Error during full sync:', error);
    }
    
    // Also sync active UI jobs
    for (const job of jobs) {
      if (['validating', 'in_progress', 'finalizing'].includes(job.status)) {
        await syncJobStatus(job.id);
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    }
    
    console.log('[STATUS SYNC] Full status sync completed');
  }, [jobs, syncJobStatus, onJobUpdate]);

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