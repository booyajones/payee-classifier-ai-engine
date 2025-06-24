
import { useEffect, useRef, useCallback } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';

interface UseBatchJobAutoPollingProps {
  jobs: BatchJob[];
  autoPollingJobs: Set<string>;
  setAutoPollingJobs: React.Dispatch<React.SetStateAction<Set<string>>>;
  handleRefreshJob: (jobId: string) => Promise<void>;
}

export const useBatchJobAutoPolling = ({
  jobs,
  autoPollingJobs,
  setAutoPollingJobs,
  handleRefreshJob
}: UseBatchJobAutoPollingProps) => {
  const pollTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const isPollingRef = useRef<Set<string>>(new Set());
  const lastJobsRef = useRef<string>('');

  // Memoize the jobs string to prevent unnecessary effects
  const jobsString = jobs.map(j => `${j.id}-${j.status}-${j.request_counts.completed}`).join(',');

  const cleanupPolling = useCallback((jobId: string) => {
    if (pollTimeouts.current[jobId]) {
      clearTimeout(pollTimeouts.current[jobId]);
      delete pollTimeouts.current[jobId];
    }
    isPollingRef.current.delete(jobId);
    console.log(`[AUTO POLLING] Stopped polling for job ${jobId.slice(-8)}`);
  }, []);

  const startPolling = useCallback(async (jobId: string) => {
    if (isPollingRef.current.has(jobId)) {
      return; // Already polling this job
    }

    console.log(`[AUTO POLLING] Starting polling for job ${jobId.slice(-8)}`);
    isPollingRef.current.add(jobId);
    
    const poll = async () => {
      try {
        console.log(`[AUTO POLLING] Polling job ${jobId.slice(-8)}`);
        await handleRefreshJob(jobId);
        
        // Check if job is still active after refresh
        const job = jobs.find(j => j.id === jobId);
        if (job && ['validating', 'in_progress', 'finalizing'].includes(job.status)) {
          // Schedule next poll
          pollTimeouts.current[jobId] = setTimeout(poll, 8000); // Poll every 8 seconds
          console.log(`[AUTO POLLING] Scheduled next poll for job ${jobId.slice(-8)} in 8 seconds`);
        } else {
          console.log(`[AUTO POLLING] Job ${jobId.slice(-8)} completed or failed, stopping polling`);
          cleanupPolling(jobId);
          setAutoPollingJobs(prev => {
            const newSet = new Set(prev);
            newSet.delete(jobId);
            return newSet;
          });
        }
      } catch (error) {
        console.error(`[AUTO POLLING] Error polling job ${jobId}:`, error);
        // Continue polling even on error, but with longer delay
        pollTimeouts.current[jobId] = setTimeout(poll, 15000); // 15 second delay on error
      }
    };

    // Start polling with initial delay
    pollTimeouts.current[jobId] = setTimeout(poll, 3000); // Start in 3 seconds
  }, [jobs, handleRefreshJob, cleanupPolling, setAutoPollingJobs]);

  useEffect(() => {
    // Only run if jobs actually changed
    if (jobsString === lastJobsRef.current) {
      return;
    }
    lastJobsRef.current = jobsString;

    console.log(`[AUTO POLLING] Jobs changed, checking active jobs. Total jobs: ${jobs.length}`);

    const activeJobs = jobs.filter(job => 
      ['validating', 'in_progress', 'finalizing'].includes(job.status)
    );

    console.log(`[AUTO POLLING] Found ${activeJobs.length} active jobs`);

    // Start polling for new active jobs
    for (const job of activeJobs) {
      if (!autoPollingJobs.has(job.id) && !isPollingRef.current.has(job.id)) {
        console.log(`[AUTO POLLING] Starting auto-polling for new active job ${job.id.slice(-8)} (status: ${job.status})`);
        setAutoPollingJobs(prev => new Set(prev).add(job.id));
        startPolling(job.id);
      }
    }

    // Stop polling for completed/failed jobs
    const activeJobIds = new Set(activeJobs.map(j => j.id));
    for (const jobId of autoPollingJobs) {
      if (!activeJobIds.has(jobId)) {
        console.log(`[AUTO POLLING] Stopping auto-polling for completed job ${jobId.slice(-8)}`);
        cleanupPolling(jobId);
        setAutoPollingJobs(prev => {
          const newSet = new Set(prev);
          newSet.delete(jobId);
          return newSet;
        });
      }
    }
  }, [jobsString, jobs, autoPollingJobs, setAutoPollingJobs, startPolling, cleanupPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[AUTO POLLING] Cleaning up all polling timeouts');
      Object.values(pollTimeouts.current).forEach(timeout => clearTimeout(timeout));
      pollTimeouts.current = {};
      isPollingRef.current.clear();
    };
  }, []);
};
