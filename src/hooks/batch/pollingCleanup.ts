import { useCallback, useRef } from 'react';
import { productionLogger } from '@/lib/logging/productionLogger';

export const usePollingCleanup = () => {
  const pollTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const isPollingRef = useRef<Set<string>>(new Set());

  const cleanupPolling = useCallback((jobId: string) => {
    if (pollTimeouts.current[jobId]) {
      clearTimeout(pollTimeouts.current[jobId]);
      delete pollTimeouts.current[jobId];
    }
    isPollingRef.current.delete(jobId);
    productionLogger.debug('Cleanup polling for job', { jobId }, 'BATCH_POLLING');
  }, []);

  const cleanupAll = useCallback(() => {
    Object.values(pollTimeouts.current).forEach(timeout => clearTimeout(timeout));
    pollTimeouts.current = {};
    isPollingRef.current.clear();
  }, []);

  return {
    pollTimeouts,
    isPollingRef,
    cleanupPolling,
    cleanupAll
  };
};