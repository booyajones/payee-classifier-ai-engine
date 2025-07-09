import { useState, useRef, useCallback, useEffect } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
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

    // Occasionally verify completed jobs (less frequently)
    if (['completed', 'failed', 'cancelled', 'expired'].includes(job.status)) {
      const lastPoll = state?.lastPoll || 0;
      const timeSinceLastPoll = Date.now() - lastPoll;
      return timeSinceLastPoll > config.completedJobInterval;
    }

    return false;
  }, [pollingStates, config]);

  const pollSingleJob = useCallback(async (job: BatchJob) => {
    const jobId = job.id;
    
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

      // Use connection manager for reliable requests
      const updatedJob = await connectionManager.executeWithRetry(
        async () => {
          const response = await fetch(`/api/batch-jobs/${jobId}/status`);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        },
        `poll-job-${jobId.slice(-8)}`
      );

      if (updatedJob) {
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

    // Schedule polls for all eligible jobs
    const schedulePoll = () => {
      jobs.forEach(job => {
        if (shouldPollJob(job)) {
          scheduleJobPoll(job);
        }
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
    if (!job) return;

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