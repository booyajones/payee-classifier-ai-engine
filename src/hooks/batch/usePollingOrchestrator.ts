import { useCallback } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { productionLogger } from '@/lib/logging/productionLogger';
import { 
  calculatePollingDelay, 
  getInitialPollingDelay, 
  getErrorRetryDelay,
  isLongRunningJob,
  isActiveJobStatus
} from './pollingIntervals';
import { useLargeJobOptimization } from './useLargeJobOptimization';

interface UsePollingOrchestratorProps {
  jobs: BatchJob[];
  handleRefreshJob: (jobId: string, silent?: boolean) => Promise<void>;
  hasJobChanged: (job: BatchJob) => boolean;
  cleanupPolling: (jobId: string) => void;
  setAutoPollingJobs: React.Dispatch<React.SetStateAction<Set<string>>>;
  pollTimeouts: React.MutableRefObject<Record<string, NodeJS.Timeout>>;
  isPollingRef: React.MutableRefObject<Set<string>>;
}

export const usePollingOrchestrator = ({
  jobs,
  handleRefreshJob,
  hasJobChanged,
  cleanupPolling,
  setAutoPollingJobs,
  pollTimeouts,
  isPollingRef
}: UsePollingOrchestratorProps) => {
  const { getPollingInterval, updatePollingInterval } = useLargeJobOptimization();

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

        // CIRCUIT BREAKER: Stop polling completed jobs immediately
        if (['completed', 'failed', 'cancelled', 'expired'].includes(job.status)) {
          productionLogger.info(`Job ${jobId.substring(0, 8)}... is ${job.status} - stopping all polling immediately`, undefined, 'BATCH_POLLING');
          cleanupPolling(jobId);
          setAutoPollingJobs(prev => {
            const newSet = new Set(prev);
            newSet.delete(jobId);
            return newSet;
          });
          return;
        }

        // CIRCUIT BREAKER: Stop polling jobs older than 48 hours
        const jobAge = Date.now() - new Date(job.created_at * 1000).getTime();
        const isTooOld = jobAge > 48 * 60 * 60 * 1000; // Over 48 hours
        if (isTooOld) {
          productionLogger.warn(`Job ${jobId.substring(0, 8)}... is too old (${Math.round(jobAge/3600000)}h) - circuit breaker activated`, undefined, 'BATCH_POLLING');
          cleanupPolling(jobId);
          setAutoPollingJobs(prev => {
            const newSet = new Set(prev);
            newSet.delete(jobId);
            return newSet;
          });
          return;
        }

        const isActiveJob = isActiveJobStatus(job.status);
        
        // Always poll active jobs - remove randomness for reliability
        const shouldPoll = isActiveJob;
        
        console.log(`[POLLING] Job ${jobId.substring(0, 8)}: active=${isActiveJob}, changed=${hasJobChanged(job)}, shouldPoll=${shouldPoll}`);
        
        if (shouldPoll) {
          await handleRefreshJob(jobId, true);
        }
        
        // Check if job is still active after refresh
        const updatedJob = jobs.find(j => j.id === jobId);
        const isStillActive = updatedJob && isActiveJobStatus(updatedJob.status);
        
        if (isStillActive) {
          // Use optimized polling for large jobs, fallback to standard calculation
          const optimizedDelay = getPollingInterval(updatedJob);
          const standardDelay = calculatePollingDelay(updatedJob);
          const delay = Math.max(optimizedDelay, standardDelay); // Use the more conservative interval
          
          updatePollingInterval(jobId, delay);
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
        const isStillActive = job && isActiveJobStatus(job.status);
        
        if (isStillActive) {
          productionLogger.warn(`Polling error for active job ${jobId.substring(0, 8)}..., retrying`, error, 'BATCH_POLLING');
          pollTimeouts.current[jobId] = setTimeout(poll, getErrorRetryDelay());
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
    const initialDelay = job ? getInitialPollingDelay(job) : 5000;
    pollTimeouts.current[jobId] = setTimeout(poll, initialDelay);
  }, [jobs, handleRefreshJob, hasJobChanged, cleanupPolling, setAutoPollingJobs, pollTimeouts, isPollingRef]);

  return { startPolling };
};