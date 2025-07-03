
// @ts-nocheck
import { useState, useRef } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';

interface PollingState {
  isPolling: boolean;
  pollCount: number;
  lastError?: string;
  lastStatus?: string;
  lastProgress?: number;
}

export const useBatchJobPolling = (
  jobs: BatchJob[],
  onJobUpdate: (job: BatchJob) => void
) => {
  const [pollingStates, setPollingStates] = useState<Record<string, PollingState>>({});
  const lastUpdateRef = useRef<Record<string, { status: string; progress: number }>>({});

  // Manual refresh for a specific job (single ping only)
  const refreshSpecificJob = async (jobId: string, refreshFunction: () => Promise<void>) => {
    // Don't start if already polling
    if (pollingStates[jobId]?.isPolling) return;

    productionLogger.debug(`[POLLING] Manual refresh for job ${jobId}`);
    
    setPollingStates(prev => ({
      ...prev,
      [jobId]: { 
        isPolling: true, 
        pollCount: (prev[jobId]?.pollCount || 0) + 1, 
        lastError: undefined,
        lastStatus: prev[jobId]?.lastStatus,
        lastProgress: prev[jobId]?.lastProgress
      }
    }));

    try {
      await refreshFunction();
      
      // Check if there was actually a meaningful change
      const job = jobs.find(j => j.id === jobId);
      if (job) {
        const lastUpdate = lastUpdateRef.current[jobId];
        const currentProgress = job.request_counts.total > 0 
          ? (job.request_counts.completed / job.request_counts.total) * 100 
          : 0;
        
        const hasStatusChange = !lastUpdate || lastUpdate.status !== job.status;
        const hasProgressChange = !lastUpdate || Math.abs(lastUpdate.progress - currentProgress) > 1;
        
        if (hasStatusChange || hasProgressChange) {
          productionLogger.debug(`[POLLING] Meaningful change detected for job ${jobId.slice(-8)}: status=${job.status}, progress=${currentProgress.toFixed(1)}%`);
          lastUpdateRef.current[jobId] = { status: job.status, progress: currentProgress };
        }
      }
      
      setPollingStates(prev => ({
        ...prev,
        [jobId]: { 
          ...prev[jobId], 
          isPolling: false,
          lastError: undefined,
          lastStatus: job?.status,
          lastProgress: job ? (job.request_counts.completed / job.request_counts.total) * 100 : 0
        }
      }));
    } catch (error) {
      productionLogger.error(`[POLLING] Error refreshing job ${jobId}:`, error);
      
      setPollingStates(prev => ({
        ...prev,
        [jobId]: { 
          ...prev[jobId], 
          isPolling: false,
          lastError: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    }
  };

  return {
    pollingStates,
    refreshSpecificJob
  };
};
