import { BatchJob } from '@/lib/openai/trueBatchAPI';

export const calculatePollingDelay = (job: BatchJob): number => {
  // CIRCUIT BREAKER: Never poll completed jobs
  if (['completed', 'failed', 'cancelled', 'expired'].includes(job.status)) {
    return Infinity; // Stop all polling for completed jobs
  }

  const now = Date.now();
  const jobAge = now - new Date(job.created_at * 1000).getTime();
  const isRecentJob = jobAge < 30 * 60 * 1000; // Under 30 minutes
  const isOldJob = jobAge > 2 * 60 * 60 * 1000; // Over 2 hours
  const isVeryOldJob = jobAge > 12 * 60 * 60 * 1000; // Over 12 hours
  const isExtremelyOldJob = jobAge > 24 * 60 * 60 * 1000; // Over 24 hours
  const isTooOld = jobAge > 48 * 60 * 60 * 1000; // Over 48 hours
  const hasProgress = job.request_counts.completed > 0;
  
  // CIRCUIT BREAKER: Stop polling jobs older than 48 hours
  if (isTooOld) {
    return Infinity; // Complete circuit breaker for ancient jobs
  }
  
  // AGGRESSIVE PERFORMANCE: Dramatically reduce polling for old jobs
  if (isExtremelyOldJob) {
    return 1800000; // 30 minutes for extremely old jobs (was 10 minutes)
  } else if (isVeryOldJob) {
    return hasProgress ? 900000 : 1800000; // 15-30 minutes for very old jobs (was 5-10 minutes)
  } else if (isOldJob) {
    return 300000; // 5 minutes for old jobs (was 2 minutes)
  } else if (isRecentJob && hasProgress) {
    return 30000; // 30 seconds for recent active jobs (was 15 seconds)
  } else {
    return 60000; // 1 minute default (was 45 seconds)
  }
};

export const getInitialPollingDelay = (job: BatchJob): number => {
  return job.status === 'in_progress' ? 2000 : 5000;
};

export const getErrorRetryDelay = (): number => {
  return 15000; // 15 seconds delay on error
};

export const isLongRunningJob = (job: BatchJob): boolean => {
  const jobAge = Date.now() - new Date(job.created_at * 1000).getTime();
  return jobAge > 12 * 60 * 60 * 1000; // Over 12 hours
};

export const isActiveJobStatus = (status: string): boolean => {
  return ['validating', 'in_progress', 'finalizing'].includes(status);
};