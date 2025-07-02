
import { useEffect, useRef, useCallback } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { productionLogger } from '@/lib/logging/productionLogger';

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
  const lastJobStatesRef = useRef<Record<string, { status: string; completed: number; lastUpdate: number }>>({});

  const cleanupPolling = useCallback((jobId: string) => {
    if (pollTimeouts.current[jobId]) {
      clearTimeout(pollTimeouts.current[jobId]);
      delete pollTimeouts.current[jobId];
    }
    isPollingRef.current.delete(jobId);
    productionLogger.debug('Cleanup polling for job', { jobId }, 'BATCH_POLLING');
  }, []);

  const hasJobChanged = useCallback((job: BatchJob): boolean => {
    const lastState = lastJobStatesRef.current[job.id];
    const now = Date.now();
    
    if (!lastState) {
      lastJobStatesRef.current[job.id] = { 
        status: job.status, 
        completed: job.request_counts.completed,
        lastUpdate: now
      };
      return true;
    }
    
    const hasStatusChange = lastState.status !== job.status;
    const hasProgressChange = lastState.completed !== job.request_counts.completed;
    const timeSinceLastUpdate = now - lastState.lastUpdate;
    
    // Force update every 30 seconds for in-progress jobs
    const shouldForceUpdate = job.status === 'in_progress' && timeSinceLastUpdate > 30000;
    
    const hasChanged = hasStatusChange || hasProgressChange || shouldForceUpdate;
    
    if (hasChanged) {
      lastJobStatesRef.current[job.id] = { 
        status: job.status, 
        completed: job.request_counts.completed,
        lastUpdate: now
      };
      // Job state changed - polling will refresh
    }
    
    return hasChanged;
  }, []);

  const startPolling = useCallback(async (jobId: string) => {
    if (isPollingRef.current.has(jobId)) {
      return; // Already polling this job
    }

    // Starting polling for active job
    isPollingRef.current.add(jobId);
    
    const poll = async () => {
      try {
        const job = jobs.find(j => j.id === jobId);
        if (!job) {
          cleanupPolling(jobId);
          return;
        }

        // Only poll active jobs - NEVER poll completed jobs
        const isActiveJob = ['validating', 'in_progress', 'finalizing'].includes(job.status);
        const shouldPoll = isActiveJob && (job.status === 'in_progress' || hasJobChanged(job) || Math.random() < 0.4);
        
        if (shouldPoll) {
          await handleRefreshJob(jobId, true);
        }
        
        // Check if job is still active after refresh
        const updatedJob = jobs.find(j => j.id === jobId);
        const isStillActive = updatedJob && ['validating', 'in_progress', 'finalizing'].includes(updatedJob.status);
        
        if (isStillActive) {
          // More frequent polling intervals
          const delay = updatedJob.status === 'in_progress' ? 10000 : 8000; // 10s for in_progress, 8s for others
          pollTimeouts.current[jobId] = setTimeout(poll, delay);
        } else {
          // Job completed or no longer exists - cleanup polling immediately
          productionLogger.info(`Job ${jobId.substring(0, 8)}... completed or removed - stopping polling`, undefined, 'BATCH_POLLING');
          cleanupPolling(jobId);
          setAutoPollingJobs(prev => {
            const newSet = new Set(prev);
            newSet.delete(jobId);
            return newSet;
          });
        }
      } catch (error) {
        // Only continue polling if job is still active, even on error
        const job = jobs.find(j => j.id === jobId);
        const isStillActive = job && ['validating', 'in_progress', 'finalizing'].includes(job.status);
        
        if (isStillActive) {
          productionLogger.warn(`Polling error for active job ${jobId.substring(0, 8)}..., retrying`, error, 'BATCH_POLLING');
          pollTimeouts.current[jobId] = setTimeout(poll, 15000); // 15 second delay on error
        } else {
          productionLogger.info(`Polling error for completed/removed job ${jobId.substring(0, 8)}..., stopping polling`, error, 'BATCH_POLLING');
          cleanupPolling(jobId);
          setAutoPollingJobs(prev => {
            const newSet = new Set(prev);
            newSet.delete(jobId);
            return newSet;
          });
        }
      }
    };

    // Start polling immediately for in-progress jobs, with delay for others
    const job = jobs.find(j => j.id === jobId);
    const initialDelay = job?.status === 'in_progress' ? 2000 : 5000;
    pollTimeouts.current[jobId] = setTimeout(poll, initialDelay);
  }, [jobs, handleRefreshJob, cleanupPolling, setAutoPollingJobs, hasJobChanged]);

  useEffect(() => {
    const activeJobs = jobs.filter(job => 
      ['validating', 'in_progress', 'finalizing'].includes(job.status)
    );

    productionLogger.debug(`Auto-polling: checking ${activeJobs.length} active jobs`, undefined, 'BATCH_POLLING');

    // Start polling for new active jobs
    for (const job of activeJobs) {
      if (!autoPollingJobs.has(job.id) && !isPollingRef.current.has(job.id)) {
        setAutoPollingJobs(prev => new Set(prev).add(job.id));
        startPolling(job.id);
      }
    }

    // Stop polling for completed/failed jobs
    const activeJobIds = new Set(activeJobs.map(j => j.id));
    for (const jobId of autoPollingJobs) {
      if (!activeJobIds.has(jobId)) {
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
      // Cleanup all polling timeouts
      Object.values(pollTimeouts.current).forEach(timeout => clearTimeout(timeout));
      pollTimeouts.current = {};
      isPollingRef.current.clear();
    };
  }, []);
};
