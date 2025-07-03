import { useState, useEffect, useCallback } from 'react';

export const useBatchJobTimeout = (job, onTimeout) => {
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [timeoutWarning, setTimeoutWarning] = useState(false);

  const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes
  const WARNING_DURATION = 25 * 60 * 1000; // 25 minutes

  const checkTimeout = useCallback(() => {
    if (!job || job.status !== 'in_progress') {
      setHasTimedOut(false);
      setTimeoutWarning(false);
      return;
    }

    const startTime = job.in_progress_at_timestamp || job.created_at_timestamp;
    if (!startTime) return;

    const elapsedTime = Date.now() - (startTime * 1000);

    setTimeoutWarning(prev => {
      const shouldWarn = elapsedTime > WARNING_DURATION;
      if (shouldWarn && !prev) {
        productionLogger.warn(`[TIMEOUT] Job ${job.id} approaching timeout at ${Math.round(elapsedTime/60000)} minutes`);
      }
      return shouldWarn;
    });

    if (elapsedTime > TIMEOUT_DURATION) {
      if (!hasTimedOut) {
        productionLogger.error(`[TIMEOUT] Job ${job.id} has timed out after ${Math.round(elapsedTime/60000)} minutes`);
        setHasTimedOut(true);
        if (onTimeout) {
          onTimeout(job);
        }
      }
    }
  }, [job, hasTimedOut, onTimeout, TIMEOUT_DURATION, WARNING_DURATION]);

  const clearTimeout = useCallback(() => {
    setHasTimedOut(prev => {
      const wasTimedOut = prev;
      if (wasTimedOut) {
        productionLogger.debug(`[TIMEOUT] Clearing timeout for job ${job?.id}`);
      }
      return false;
    });
    setTimeoutWarning(false);
  }, [job?.id]);

  useEffect(() => {
    if (!job) return;

    const interval = setInterval(checkTimeout, 60000); // Check every minute
    checkTimeout(); // Initial check

    return () => clearInterval(interval);
  }, [checkTimeout]);

  useEffect(() => {
    if (job && (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled')) {
      clearTimeout();
    }
  }, [job?.status, clearTimeout]);

  return {
    hasTimedOut,
    timeoutWarning,
    clearTimeout
  };
};