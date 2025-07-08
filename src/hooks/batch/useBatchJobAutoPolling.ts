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
    // EMERGENCY STABILIZATION: Only poll when absolutely necessary
    const now = Date.now();
    const activeJobs = jobs.filter(job => {
      // EMERGENCY: Stop ALL polling for completed jobs immediately
      if (!isActiveJobStatus(job.status)) {
        if (autoPollingJobs.has(job.id)) {
          console.log(`[AUTO-POLLING] Emergency stop for ${job.status} job ${job.id.substring(0, 8)}`);
          cleanupPolling(job.id);
          setAutoPollingJobs(prev => {
            const newSet = new Set(prev);
            newSet.delete(job.id);
            return newSet;
          });
        }
        return false;
      }
      
      // EMERGENCY: Dramatically reduced age limit to 12 hours
      const jobAge = now - new Date(job.created_at * 1000).getTime();
      if (jobAge > 12 * 60 * 60 * 1000) {
        if (autoPollingJobs.has(job.id)) {
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

    // PHASE 3: Drastically limit total polling jobs to prevent overload
    const maxPollingJobs = 2; // Reduced from 3 to 2
    const jobsToPoll = activeJobs.slice(0, maxPollingJobs);
    
    productionLogger.debug(`Emergency auto-polling: ${jobsToPoll.length}/${activeJobs.length} jobs (limited to ${maxPollingJobs})`, undefined, 'BATCH_POLLING');

    // Start polling only for priority jobs
    for (const job of jobsToPoll) {
      if (!autoPollingJobs.has(job.id) && !isPollingRef.current.has(job.id)) {
        setAutoPollingJobs(prev => new Set(prev).add(job.id));
        startPolling(job.id);
      }
    }

    // EMERGENCY CLEANUP: Stop all non-priority jobs
    const priorityJobIds = new Set(jobsToPoll.map(j => j.id));
    const jobsToCleanup = Array.from(autoPollingJobs).filter(jobId => !priorityJobIds.has(jobId));
    
    if (jobsToCleanup.length > 0) {
      productionLogger.info(`Emergency cleanup: ${jobsToCleanup.length} jobs`, { jobsToCleanup: jobsToCleanup.map(id => id.substring(0, 8)) }, 'BATCH_POLLING');
      for (const jobId of jobsToCleanup) {
        cleanupPolling(jobId);
        setAutoPollingJobs(prev => {
          const newSet = new Set(prev);
          newSet.delete(jobId);
          return newSet;
        });
      }
    }
  }, []); // CRITICAL: Empty deps to prevent render loops

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAll();
    };
  }, [cleanupAll]);
};