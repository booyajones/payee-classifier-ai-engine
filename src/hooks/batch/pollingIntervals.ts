import { BatchJob } from '@/lib/openai/trueBatchAPI';

export const calculatePollingDelay = (job: BatchJob): number => {
  const now = Date.now();
  const jobAge = now - new Date(job.created_at * 1000).getTime();
  const isRecentJob = jobAge < 30 * 60 * 1000; // Under 30 minutes
  const isOldJob = jobAge > 2 * 60 * 60 * 1000; // Over 2 hours
  const isVeryOldJob = jobAge > 12 * 60 * 60 * 1000; // Over 12 hours
  const hasProgress = job.request_counts.completed > 0;
  
  if (isVeryOldJob) {
    return hasProgress ? 120000 : 300000; // 2-5 minutes for very old jobs
  } else if (isOldJob) {
    return 60000; // 1 minute for old jobs
  } else if (isRecentJob && hasProgress) {
    return 10000; // 10 seconds for recent active jobs
  } else {
    return 30000; // 30 seconds default
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