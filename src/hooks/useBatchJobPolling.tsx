
import { useState } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';

interface PollingState {
  isPolling: boolean;
  pollCount: number;
  lastError?: string;
}

export const useBatchJobPolling = (
  jobs: BatchJob[],
  onJobUpdate: (job: BatchJob) => void
) => {
  const [pollingStates, setPollingStates] = useState<Record<string, PollingState>>({});

  // Manual refresh for a specific job (single ping only)
  const refreshSpecificJob = async (jobId: string, refreshFunction: () => Promise<void>) => {
    // Don't start if already polling
    if (pollingStates[jobId]?.isPolling) return;

    console.log(`[POLLING] Manual refresh for job ${jobId}`);
    
    setPollingStates(prev => ({
      ...prev,
      [jobId]: { isPolling: true, pollCount: (prev[jobId]?.pollCount || 0) + 1, lastError: undefined }
    }));

    try {
      await refreshFunction();
      
      setPollingStates(prev => ({
        ...prev,
        [jobId]: { 
          ...prev[jobId], 
          isPolling: false,
          lastError: undefined
        }
      }));
    } catch (error) {
      console.error(`[POLLING] Error refreshing job ${jobId}:`, error);
      
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
