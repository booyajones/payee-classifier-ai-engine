import { BatchJob } from '@/lib/openai/trueBatchAPI';

export const calculatePollingDelay = (job: BatchJob): number => {
  const now = Date.now();
  const jobAge = now - new Date(job.created_at * 1000).getTime();
  const isRecentJob = jobAge < 30 * 60 * 1000; // Under 30 minutes
  const isOldJob = jobAge > 2 * 60 * 60 * 1000; // Over 2 hours
  const isVeryOldJob = jobAge > 12 * 60 * 60 * 1000; // Over 12 hours
  const isExtremelyOldJob = jobAge > 24 * 60 * 60 * 1000; // Over 24 hours
  const hasProgress = job.request_counts.completed > 0;
  
  // PERFORMANCE: Dramatically reduce polling for extremely old jobs to prevent unresponsiveness
  if (isExtremelyOldJob) {
    return 600000; // 10 minutes for extremely old jobs
  } else if (isVeryOldJob) {
    return hasProgress ? 300000 : 600000; // 5-10 minutes for very old jobs
  } else if (isOldJob) {
    return 120000; // 2 minutes for old jobs
  } else if (isRecentJob && hasProgress) {
    return 15000; // 15 seconds for recent active jobs
  } else {
    return 45000; // 45 seconds default
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