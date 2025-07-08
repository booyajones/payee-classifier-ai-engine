import { BatchJob } from '@/lib/openai/trueBatchAPI';

export const calculatePollingDelay = (job: BatchJob): number => {
  // CIRCUIT BREAKER: Never poll completed jobs
  if (['completed', 'failed', 'cancelled', 'expired'].includes(job.status)) {
    return Infinity; // Stop all polling for completed jobs
  }

  const now = Date.now();
  const createdTime = new Date(job.created_at * 1000);
  const jobAge = now - createdTime.getTime();
  
  // EMERGENCY: Dramatically reduced polling to prevent system overload
  if (jobAge > 12 * 60 * 60 * 1000) { // Over 12 hours (reduced from 24)
    console.warn(`[POLLING] Job ${job.id.substring(0, 8)} is over 12 hours old - stopping polling`);
    return Infinity; // Stop polling completely for old jobs
  }
  
  if (jobAge > 6 * 60 * 60 * 1000) { // Over 6 hours
    return 30 * 60 * 1000; // 30 minutes for very old jobs (increased from 15)
  }
  
  if (jobAge > 3 * 60 * 60 * 1000) { // Over 3 hours
    return 20 * 60 * 1000; // 20 minutes for old jobs (increased from 10)
  }
  
  if (jobAge > 1 * 60 * 60 * 1000) { // Over 1 hour
    return 10 * 60 * 1000; // 10 minutes (increased from 5)
  }
  
  if (jobAge > 30 * 60 * 1000) { // Over 30 minutes
    return 5 * 60 * 1000; // 5 minutes (increased from 3)
  }
  
  if (jobAge > 15 * 60 * 1000) { // Over 15 minutes
    return 3 * 60 * 1000; // 3 minutes for medium-aged jobs
  }
  
  // EMERGENCY: Much more conservative polling for fresh jobs
  const hasProgress = job.request_counts.completed > 0;
  return hasProgress ? 2 * 60 * 1000 : 3 * 60 * 1000; // 2-3 minutes for new jobs (increased from 1-2 minutes)
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