
import { useEffect, useRef, useCallback } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';

interface UseBatchJobAutoPollingProps {
  jobs: BatchJob[];
  autoPollingJobs: Set<string>;
  setAutoPollingJobs: React.Dispatch<React.SetStateAction<Set<string>>>;
  handleRefreshJob: (jobId: string, silent?: boolean) => Promise<void>;
}

export const useBatchJobAutoPolling = ({
  jobs,
  autoPollingJobs,
  setAutoPollingJobs,
  handleRefreshJob
}: UseBatchJobAutoPollingProps) => {
  const pollTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const isPollingRef = useRef<Set<string>>(new Set());
  const lastJobStatesRef = useRef<Record<string, { status: string; completed: number }>>({});

  const cleanupPolling = useCallback((jobId: string) => {
    if (pollTimeouts.current[jobId]) {
      clearTimeout(pollTimeouts.current[jobId]);
      delete pollTimeouts.current[jobId];
    }
    isPollingRef.current.delete(jobId);
    console.log(`[AUTO POLLING] Stopped polling for job ${jobId.slice(-8)}`);
  }, []);

  const hasJobChanged = useCallback((job: BatchJob): boolean => {
    const lastState = lastJobStatesRef.current[job.id];
    if (!lastState) {
      lastJobStatesRef.current[job.id] = { status: job.status, completed: job.request_counts.completed };
      return true;
    }
    
    const hasChanged = lastState.status !== job.status || lastState.completed !== job.request_counts.completed;
    if (hasChanged) {
      lastJobStatesRef.current[job.id] = { status: job.status, completed: job.request_counts.completed };
    }
    
    return hasChanged;
  }, []);

  const startPolling = useCallback(async (jobId: string) => {
    if (isPollingRef.current.has(jobId)) {
      return; // Already polling this job
    }

    console.log(`[AUTO POLLING] Starting polling for job ${jobId.slice(-8)}`);
    isPollingRef.current.add(jobId);
    
    const poll = async () => {
      try {
        const job = jobs.find(j => j.id === jobId);
        if (!job) {
          cleanupPolling(jobId);
          return;
        }

        // Only poll if there's a chance for change or if it's been a while
        const shouldPoll = hasJobChanged(job) || Math.random() < 0.3; // Reduce frequency
        
        if (shouldPoll) {
          console.log(`[AUTO POLLING] Checking job ${jobId.slice(-8)} for changes`);
          // Pass silent: true to prevent toast notifications during auto-polling
          await handleRefreshJob(jobId, true);
        }
        
        // Check if job is still active after refresh
        const updatedJob = jobs.find(j => j.id === jobId);
        if (updatedJob && ['validating', 'in_progress', 'finalizing'].includes(updatedJob.status)) {
          // Use longer intervals to reduce noise
          const delay = updatedJob.status === 'in_progress' ? 15000 : 10000; // 15s for in_progress, 10s for others
          pollTimeouts.current[jobId] = setTimeout(poll, delay);
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
        pollTimeouts.current[jobId] = setTimeout(poll, 20000); // 20 second delay on error
      }
    };

    // Start polling with initial delay
    pollTimeouts.current[jobId] = setTimeout(poll, 5000); // Start in 5 seconds
  }, [jobs, handleRefreshJob, cleanupPolling, setAutoPollingJobs, hasJobChanged]);

  useEffect(() => {
    const activeJobs = jobs.filter(job => 
      ['validating', 'in_progress', 'finalizing'].includes(job.status)
    );

    // Start polling for new active jobs
    for (const job of activeJobs) {
      if (!autoPollingJobs.has(job.id) && !isPollingRef.current.has(job.id)) {
        console.log(`[AUTO POLLING] Starting auto-polling for active job ${job.id.slice(-8)} (status: ${job.status})`);
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
  }, [jobs, autoPollingJobs, setAutoPollingJobs, startPolling, cleanupPolling]);

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
