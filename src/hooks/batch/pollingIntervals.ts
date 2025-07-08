import { BatchJob } from '@/lib/openai/trueBatchAPI';

export const calculatePollingDelay = (job: BatchJob): number => {
  // Circuit breaker - Never poll completed jobs
  if (['completed', 'failed', 'cancelled', 'expired'].includes(job.status)) {
    return Infinity; // Stop all polling for completed jobs
  }

  const now = Date.now();
  const createdTime = new Date(job.created_at * 1000);
  const jobAge = now - createdTime.getTime();
  
  // Stop polling very old jobs to conserve resources
  if (jobAge > 24 * 60 * 60 * 1000) { // Over 24 hours
    console.warn(`[POLLING] Job ${job.id.substring(0, 8)} is over 24 hours old - stopping polling`);
    return Infinity; // Stop polling completely for very old jobs
  }
  
  if (jobAge > 6 * 60 * 60 * 1000) { // Over 6 hours
    return 30 * 60 * 1000; // 30 minutes for very old jobs
  }
  
  if (jobAge > 2 * 60 * 60 * 1000) { // Over 2 hours
    return 10 * 60 * 1000; // 10 minutes for old jobs
  }
  
  if (jobAge > 1 * 60 * 60 * 1000) { // Over 1 hour
    return 5 * 60 * 1000; // 5 minutes
  }
  
  if (jobAge > 30 * 60 * 1000) { // Over 30 minutes
    return 2 * 60 * 1000; // 2 minutes for medium-aged jobs
  }
  
  if (jobAge > 10 * 60 * 1000) { // Over 10 minutes
    return 60 * 1000; // 1 minute for fresh jobs
  }
  
  // More responsive polling for very fresh jobs
  const hasProgress = job.request_counts.completed > 0;
  return hasProgress ? 30 * 1000 : 45 * 1000; // 30-45 seconds for new jobs
};

export const getInitialPollingDelay = (job: BatchJob): number => {
  const jobAge = Date.now() - new Date(job.created_at * 1000).getTime();
  
  // Very responsive initial polling for fresh jobs
  if (jobAge < 2 * 60 * 1000) { // Under 2 minutes
    return job.status === 'in_progress' ? 1000 : 2000; // 1-2 seconds
  }
  
  if (jobAge < 10 * 60 * 1000) { // Under 10 minutes
    return job.status === 'in_progress' ? 3000 : 5000; // 3-5 seconds
  }
  
  // Longer initial delay for older jobs
  return 8000; // 8 seconds for older jobs
};

export const getErrorRetryDelay = (): number => {
  return 10000; // 10 seconds delay on error (reduced from 15)
};

export const isLongRunningJob = (job: BatchJob): boolean => {
  const jobAge = Date.now() - new Date(job.created_at * 1000).getTime();
  return jobAge > 12 * 60 * 60 * 1000; // Over 12 hours
};

export const isActiveJobStatus = (status: string): boolean => {
  return ['validating', 'in_progress', 'finalizing'].includes(status);
};