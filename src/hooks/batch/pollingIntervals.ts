import { BatchJob } from '@/lib/openai/trueBatchAPI';

export const calculatePollingDelay = (job: BatchJob): number => {
  // PHASE 3: Circuit breaker - Never poll completed jobs
  if (['completed', 'failed', 'cancelled', 'expired'].includes(job.status)) {
    return Infinity; // Stop all polling for completed jobs
  }

  const now = Date.now();
  const createdTime = new Date(job.created_at * 1000);
  const jobAge = now - createdTime.getTime();
  
  // PHASE 3: Extremely conservative polling to reduce system load
  if (jobAge > 8 * 60 * 60 * 1000) { // Over 8 hours (further reduced)
    console.warn(`[POLLING] Job ${job.id.substring(0, 8)} is over 8 hours old - stopping polling`);
    return Infinity; // Stop polling completely for old jobs
  }
  
  if (jobAge > 4 * 60 * 60 * 1000) { // Over 4 hours
    return 60 * 60 * 1000; // 1 hour for very old jobs (much longer)
  }
  
  if (jobAge > 2 * 60 * 60 * 1000) { // Over 2 hours
    return 30 * 60 * 1000; // 30 minutes for old jobs
  }
  
  if (jobAge > 1 * 60 * 60 * 1000) { // Over 1 hour
    return 15 * 60 * 1000; // 15 minutes
  }
  
  if (jobAge > 30 * 60 * 1000) { // Over 30 minutes
    return 10 * 60 * 1000; // 10 minutes
  }
  
  if (jobAge > 15 * 60 * 1000) { // Over 15 minutes
    return 5 * 60 * 1000; // 5 minutes for medium-aged jobs
  }
  
  // PHASE 3: Very conservative polling for fresh jobs
  const hasProgress = job.request_counts.completed > 0;
  return hasProgress ? 3 * 60 * 1000 : 5 * 60 * 1000; // 3-5 minutes for new jobs (much longer)
};

export const getInitialPollingDelay = (job: BatchJob): number => {
  const jobAge = Date.now() - new Date(job.created_at * 1000).getTime();
  
  // Immediate polling for very fresh jobs
  if (jobAge < 5 * 60 * 1000) { // Under 5 minutes
    return job.status === 'in_progress' ? 2000 : 5000;
  }
  
  // Longer initial delay for older jobs
  return 10000; // 10 seconds for older jobs
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