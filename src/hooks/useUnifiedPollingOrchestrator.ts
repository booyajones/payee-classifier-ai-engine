import { useState, useRef, useCallback, useEffect } from 'react';
import { BatchJob, checkBatchJobStatus } from '@/lib/openai/trueBatchAPI';
import { connectionManager } from '@/lib/network/connectionManager';

interface PollingState {
  isPolling: boolean;
  lastPoll: number;
  pollCount: number;
  consecutiveErrors: number;
}

interface PollingConfig {
  activeJobInterval: number;
  completedJobInterval: number;
  maxConsecutiveErrors: number;
  backoffMultiplier: number;
  maxInterval: number;
}

/**
 * Unified polling orchestrator that consolidates all polling logic
 * to prevent conflicts and reduce resource usage
 */
export const useUnifiedPollingOrchestrator = (
  jobs: BatchJob[],
  onJobUpdate: (job: BatchJob) => void
) => {
  const [pollingStates, setPollingStates] = useState<Record<string, PollingState>>({});
  const pollTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const globalPollingRef = useRef<NodeJS.Timeout | null>(null);
  
  const config: PollingConfig = {
    activeJobInterval: 15000, // 15 seconds for active jobs
    completedJobInterval: 60000, // 1 minute for completed jobs (verification)
    maxConsecutiveErrors: 3,
    backoffMultiplier: 2,
    maxInterval: 120000 // 2 minutes max
  };

  const shouldPollJob = useCallback((job: BatchJob): boolean => {
    // Validate job exists and has valid ID
    if (!job || !job.id || job.id.length < 10) {
      console.warn('[POLLING ORCHESTRATOR] Invalid job or job ID:', job?.id);
      return false;
    }

    // Don't poll if network is unhealthy
    if (!connectionManager.isHealthy()) {
      return false;
    }

    const state = pollingStates[job.id];
    
    // Don't poll if too many consecutive errors
    if (state?.consecutiveErrors >= config.maxConsecutiveErrors) {
      return false;
    }

    // Always poll active jobs
    if (['validating', 'in_progress', 'finalizing'].includes(job.status)) {
      return true;
    }

    // Stop polling completed jobs completely - no verification needed
    if (['completed', 'failed', 'cancelled', 'expired'].includes(job.status)) {
      return false;
    }

    return false;
  }, [pollingStates, config]);

  const pollSingleJob = useCallback(async (job: BatchJob) => {
    const jobId = job.id;
    
    // Validate job before polling
    if (!jobId || jobId.length < 10) {
      console.warn('[POLLING ORCHESTRATOR] Invalid job ID, skipping poll:', jobId);
      return;
    }
    
    try {
      setPollingStates(prev => ({
        ...prev,
        [jobId]: {
          ...prev[jobId],
          isPolling: true,
          lastPoll: Date.now(),
          pollCount: (prev[jobId]?.pollCount || 0) + 1
        }
      }));

      // Use proper checkBatchJobStatus instead of non-existent API endpoint
      const updatedJob = await connectionManager.executeWithRetry(
        () => checkBatchJobStatus(jobId),
        `poll-job-${jobId.slice(-8)}`
      );

      if (updatedJob) {
        console.log(`[POLLING ORCHESTRATOR] Job ${jobId.slice(-8)} status: ${updatedJob.status}, progress: ${updatedJob.request_counts.completed}/${updatedJob.request_counts.total}`);
        onJobUpdate(updatedJob);
      }

      // Reset error count on success
      setPollingStates(prev => ({
        ...prev,
        [jobId]: {
          ...prev[jobId],
          isPolling: false,
          consecutiveErrors: 0
        }
      }));

    } catch (error) {
      console.warn(`[POLLING ORCHESTRATOR] Error polling job ${jobId.slice(-8)}:`, error);
      
      setPollingStates(prev => ({
        ...prev,
        [jobId]: {
          ...prev[jobId],
          isPolling: false,
          consecutiveErrors: (prev[jobId]?.consecutiveErrors || 0) + 1
        }
      }));
    }
  }, [onJobUpdate]);

  const scheduleJobPoll = useCallback((job: BatchJob) => {
    const jobId = job.id;
    
    // Clear existing timer
    if (pollTimersRef.current[jobId]) {
      clearTimeout(pollTimersRef.current[jobId]);
    }

    if (!shouldPollJob(job)) {
      return;
    }

    const state = pollingStates[jobId];
    let interval = ['validating', 'in_progress', 'finalizing'].includes(job.status)
      ? config.activeJobInterval
      : config.completedJobInterval;

    // Apply backoff for jobs with errors
    if (state?.consecutiveErrors > 0) {
      interval = Math.min(
        interval * Math.pow(config.backoffMultiplier, state.consecutiveErrors),
        config.maxInterval
      );
    }

    pollTimersRef.current[jobId] = setTimeout(() => {
      pollSingleJob(job);
    }, interval);

  }, [shouldPollJob, pollingStates, pollSingleJob, config]);

  // Main orchestrator effect
  useEffect(() => {
    // Clear existing global timer
    if (globalPollingRef.current) {
      clearTimeout(globalPollingRef.current);
    }

    // Schedule polls for all eligible jobs with validation
    const schedulePoll = () => {
      // Filter out invalid jobs before scheduling
      const validJobs = jobs.filter(job => job && job.id && job.id.length > 10);
      
      validJobs.forEach(job => {
        if (shouldPollJob(job)) {
          scheduleJobPoll(job);
        }
      });

      // Clean up polling states for jobs that no longer exist
      const validJobIds = new Set(validJobs.map(j => j.id));
      setPollingStates(prev => {
        const filteredStates: Record<string, PollingState> = {};
        Object.entries(prev).forEach(([jobId, state]) => {
          if (validJobIds.has(jobId)) {
            filteredStates[jobId] = state;
          }
        });
        return filteredStates;
      });

      // Schedule next orchestration check
      globalPollingRef.current = setTimeout(schedulePoll, 30000); // Check every 30 seconds
    };

    // Start orchestration after a brief delay
    globalPollingRef.current = setTimeout(schedulePoll, 5000);

    return () => {
      // Cleanup all timers
      if (globalPollingRef.current) {
        clearTimeout(globalPollingRef.current);
      }
      
      Object.values(pollTimersRef.current).forEach(timer => {
        clearTimeout(timer);
      });
      pollTimersRef.current = {};
    };
  }, [jobs, shouldPollJob, scheduleJobPoll]);

  const manualRefresh = useCallback(async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) {
      console.warn(`[POLLING ORCHESTRATOR] Cannot refresh job ${jobId} - not found in jobs list`);
      return;
    }

    // Clear scheduled poll and do immediate poll
    if (pollTimersRef.current[jobId]) {
      clearTimeout(pollTimersRef.current[jobId]);
      delete pollTimersRef.current[jobId];
    }

    await pollSingleJob(job);
  }, [jobs, pollSingleJob]);

  const stopPolling = useCallback((jobId: string) => {
    if (pollTimersRef.current[jobId]) {
      clearTimeout(pollTimersRef.current[jobId]);
      delete pollTimersRef.current[jobId];
    }

    setPollingStates(prev => {
      const newStates = { ...prev };
      delete newStates[jobId];
      return newStates;
    });
  }, []);

  return {
    pollingStates,
    manualRefresh,
    stopPolling,
    isHealthy: connectionManager.isHealthy()
  };
};