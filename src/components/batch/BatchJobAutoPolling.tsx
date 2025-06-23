
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
  }, []);

  const startPolling = useCallback(async (jobId: string) => {
    if (isPollingRef.current.has(jobId)) {
      return; // Already polling this job
    }

    isPollingRef.current.add(jobId);
    
    const poll = async () => {
      try {
        await handleRefreshJob(jobId);
      } catch (error) {
        console.error(`[AUTO POLLING] Error polling job ${jobId}:`, error);
      } finally {
        // Schedule next poll if job is still active
        const job = jobs.find(j => j.id === jobId);
        if (job && ['validating', 'in_progress', 'finalizing'].includes(job.status)) {
          pollTimeouts.current[jobId] = setTimeout(poll, 10000); // Poll every 10 seconds
        } else {
          cleanupPolling(jobId);
          setAutoPollingJobs(prev => {
            const newSet = new Set(prev);
            newSet.delete(jobId);
            return newSet;
          });
        }
      }
    };

    // Start polling with initial delay
    pollTimeouts.current[jobId] = setTimeout(poll, 5000);
  }, [jobs, handleRefreshJob, cleanupPolling, setAutoPollingJobs]);

  useEffect(() => {
    // Only run if jobs actually changed
    if (jobsString === lastJobsRef.current) {
      return;
    }
    lastJobsRef.current = jobsString;

    const activeJobs = jobs.filter(job => 
      ['validating', 'in_progress', 'finalizing'].includes(job.status)
    );

    // Start polling for new active jobs
    for (const job of activeJobs) {
      if (!autoPollingJobs.has(job.id) && !isPollingRef.current.has(job.id)) {
        console.log(`[AUTO POLLING] Starting auto-polling for job ${job.id.slice(-8)}`);
        setAutoPollingJobs(prev => new Set(prev).add(job.id));
        startPolling(job.id);
      }
    }

    // Stop polling for completed/failed jobs
    const activeJobIds = new Set(activeJobs.map(j => j.id));
    for (const jobId of autoPollingJobs) {
      if (!activeJobIds.has(jobId)) {
        console.log(`[AUTO POLLING] Stopping auto-polling for job ${jobId.slice(-8)}`);
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
      Object.values(pollTimeouts.current).forEach(timeout => clearTimeout(timeout));
      pollTimeouts.current = {};
      isPollingRef.current.clear();
    };
  }, []);
};
