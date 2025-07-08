import { BatchJob } from '@/lib/openai/trueBatchAPI';

export const calculatePollingDelay = (job: BatchJob): number => {
  // CIRCUIT BREAKER: Never poll completed jobs
  if (['completed', 'failed', 'cancelled', 'expired'].includes(job.status)) {
    return Infinity; // Stop all polling for completed jobs
  }

  const now = Date.now();
  const createdTime = new Date(job.created_at * 1000);
  const jobAge = now - createdTime.getTime();
  
  // AUTOMATIC MANAGEMENT: Dramatically reduce polling for old jobs to prevent unresponsiveness
  if (jobAge > 24 * 60 * 60 * 1000) { // Over 24 hours
    console.warn(`[POLLING] Job ${job.id.substring(0, 8)} is over 24 hours old - stopping polling`);
    return Infinity; // Stop polling completely for ancient jobs
  }
  
  if (jobAge > 12 * 60 * 60 * 1000) { // Over 12 hours
    return 15 * 60 * 1000; // 15 minutes for very old jobs
  }
  
  if (jobAge > 6 * 60 * 60 * 1000) { // Over 6 hours
    return 10 * 60 * 1000; // 10 minutes for old jobs
  }
  
  if (jobAge > 2 * 60 * 60 * 1000) { // Over 2 hours
    return 5 * 60 * 1000; // 5 minutes
  }
  
  if (jobAge > 1 * 60 * 60 * 1000) { // Over 1 hour
    return 3 * 60 * 1000; // 3 minutes
  }
  
  if (jobAge > 30 * 60 * 1000) { // Over 30 minutes
    return 2 * 60 * 1000; // 2 minutes
  }
  
  // Fresh jobs get more frequent polling but not too aggressive
  const hasProgress = job.request_counts.completed > 0;
  return hasProgress ? 60 * 1000 : 120 * 1000; // 1-2 minutes for new jobs (reduced from 30-60 seconds)
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