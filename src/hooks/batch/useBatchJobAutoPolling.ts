import { useEffect } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { productionLogger } from '@/lib/logging/productionLogger';
import { usePollingCleanup } from './pollingCleanup';
import { useJobChangeDetection } from './jobChangeDetection';
import { usePollingOrchestrator } from './usePollingOrchestrator';
import { isActiveJobStatus } from './pollingIntervals';

interface UseBatchJobAutoPollingProps {
  jobs: BatchJob[];
  autoPollingJobs: Set<string>;
  setAutoPollingJobs: React.Dispatch<React.SetStateAction<Set<string>>>;
  handleRefreshJob: (jobId: string, silent?: boolean) => Promise<void>;
}

export type { UseBatchJobAutoPollingProps };

export const useBatchJobAutoPolling = ({
  jobs,
  autoPollingJobs,
  setAutoPollingJobs,
  handleRefreshJob
}: UseBatchJobAutoPollingProps) => {
  const { pollTimeouts, isPollingRef, cleanupPolling, cleanupAll } = usePollingCleanup();
  const { hasJobChanged } = useJobChangeDetection();
  
  const { startPolling } = usePollingOrchestrator({
    jobs,
    handleRefreshJob,
    hasJobChanged,
    cleanupPolling,
    setAutoPollingJobs,
    pollTimeouts,
    isPollingRef
  });

  useEffect(() => {
    const activeJobs = jobs.filter(job => isActiveJobStatus(job.status));

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
  }, [jobs, autoPollingJobs, setAutoPollingJobs, startPolling, cleanupPolling, isPollingRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAll();
    };
  }, [cleanupAll]);
};