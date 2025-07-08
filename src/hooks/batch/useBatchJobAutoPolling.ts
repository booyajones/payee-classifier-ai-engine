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
    // CIRCUIT BREAKER: Only poll truly active jobs, exclude completed and ancient jobs
    const activeJobs = jobs.filter(job => {
      // STOP ALL POLLING for completed, failed, cancelled, or expired jobs
      if (!isActiveJobStatus(job.status)) {
        // If it was being polled, clean it up immediately
        if (autoPollingJobs.has(job.id)) {
          console.log(`[AUTO-POLLING] Stopping polling for ${job.status} job ${job.id.substring(0, 8)}`);
          cleanupPolling(job.id);
          setAutoPollingJobs(prev => {
            const newSet = new Set(prev);
            newSet.delete(job.id);
            return newSet;
          });
        }
        return false;
      }
      
      // CIRCUIT BREAKER: Stop polling jobs older than 48 hours
      const jobAge = Date.now() - new Date(job.created_at * 1000).getTime();
      if (jobAge > 48 * 60 * 60 * 1000) {
        productionLogger.warn(`Auto-polling: Excluding ancient job ${job.id.substring(0, 8)} (age: ${Math.round(jobAge/3600000)}h)`, undefined, 'BATCH_POLLING');
        return false;
      }
      
      return true;
    });

    productionLogger.debug(`Auto-polling: checking ${activeJobs.length} active jobs (${jobs.length - activeJobs.length} excluded)`, undefined, 'BATCH_POLLING');

    // Start polling for new active jobs
    for (const job of activeJobs) {
      if (!autoPollingJobs.has(job.id) && !isPollingRef.current.has(job.id)) {
        setAutoPollingJobs(prev => new Set(prev).add(job.id));
        startPolling(job.id);
      }
    }

    // AGGRESSIVE CLEANUP: Stop polling for ALL non-active jobs
    const activeJobIds = new Set(activeJobs.map(j => j.id));
    const jobsToCleanup = Array.from(autoPollingJobs).filter(jobId => !activeJobIds.has(jobId));
    
    if (jobsToCleanup.length > 0) {
      productionLogger.info(`Auto-polling: Cleaning up ${jobsToCleanup.length} inactive job(s)`, { jobsToCleanup: jobsToCleanup.map(id => id.substring(0, 8)) }, 'BATCH_POLLING');
      
      for (const jobId of jobsToCleanup) {
        cleanupPolling(jobId);
        setAutoPollingJobs(prev => {
          const newSet = new Set(prev);
          newSet.delete(jobId);
          return newSet;
        });
      }
    }
  }, [jobs.length, autoPollingJobs.size, startPolling, cleanupPolling]); // Only re-run when counts change

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAll();
    };
  }, [cleanupAll]);
};