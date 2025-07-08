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
    // Optimized auto-polling: More responsive and less restrictive
    const now = Date.now();
    const activeJobs = jobs.filter(job => {
      // Stop polling for completed jobs immediately
      if (!isActiveJobStatus(job.status)) {
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
      
      // Extended age limit to 24 hours for better user experience
      const jobAge = now - new Date(job.created_at * 1000).getTime();
      if (jobAge > 24 * 60 * 60 * 1000) {
        if (autoPollingJobs.has(job.id)) {
          console.log(`[AUTO-POLLING] Stopping polling for old job ${job.id.substring(0, 8)} (${Math.round(jobAge/3600000)}h old)`);
          cleanupPolling(job.id);
          setAutoPollingJobs(prev => {
            const newSet = new Set(prev);
            newSet.delete(job.id);
            return newSet;
          });
        }
        return false;
      }
      
      return true;
    });

    // Increased polling capacity for better responsiveness
    const maxPollingJobs = 3; // Increased from 2 to 3
    const jobsToPoll = activeJobs.slice(0, maxPollingJobs);
    
    console.log(`[AUTO-POLLING] Managing ${jobsToPoll.length}/${activeJobs.length} jobs (max: ${maxPollingJobs})`);
    productionLogger.debug(`Auto-polling: ${jobsToPoll.length}/${activeJobs.length} jobs (limited to ${maxPollingJobs})`, undefined, 'BATCH_POLLING');

    // Start polling for priority jobs
    for (const job of jobsToPoll) {
      if (!autoPollingJobs.has(job.id) && !isPollingRef.current.has(job.id)) {
        console.log(`[AUTO-POLLING] Starting polling for job ${job.id.substring(0, 8)} (${job.status})`);
        setAutoPollingJobs(prev => new Set(prev).add(job.id));
        startPolling(job.id);
      }
    }

    // Clean up non-priority jobs
    const priorityJobIds = new Set(jobsToPoll.map(j => j.id));
    const jobsToCleanup = Array.from(autoPollingJobs).filter(jobId => !priorityJobIds.has(jobId));
    
    if (jobsToCleanup.length > 0) {
      console.log(`[AUTO-POLLING] Cleaning up ${jobsToCleanup.length} non-priority jobs`);
      productionLogger.info(`Cleanup: ${jobsToCleanup.length} jobs`, { jobsToCleanup: jobsToCleanup.map(id => id.substring(0, 8)) }, 'BATCH_POLLING');
      for (const jobId of jobsToCleanup) {
        cleanupPolling(jobId);
        setAutoPollingJobs(prev => {
          const newSet = new Set(prev);
          newSet.delete(jobId);
          return newSet;
        });
      }
    }
  }, [jobs, autoPollingJobs, setAutoPollingJobs, cleanupPolling, startPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAll();
    };
  }, [cleanupAll]);
};