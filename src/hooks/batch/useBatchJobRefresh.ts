
import { useCallback, useRef } from 'react';
import { handleError, showErrorToast } from '@/lib/errorHandler';

export const useBatchJobRefresh = (
  refreshJobs: (silent?: boolean) => Promise<void>,
  clearError: (key: string) => void,
  setError: (key: string, error: string) => void
) => {
  const refreshInProgress = useRef<Set<string>>(new Set());

  const performRefresh = useCallback(async (silent = false) => {
    const refreshKey = 'global';
    if (refreshInProgress.current.has(refreshKey)) {
      productionLogger.debug('[JOB REFRESH] Global refresh already in progress, skipping...');
      return;
    }
    
    try {
      refreshInProgress.current.add(refreshKey);
      clearError('refresh');
      await refreshJobs(silent);
    } catch (error) {
      productionLogger.error('[JOB REFRESH] Error during refresh:', error);
      const appError = handleError(error, 'Refresh Jobs');
      setError('refresh', appError.message);
      if (!silent) {
        showErrorToast(appError, 'Refresh Jobs');
      }
    } finally {
      refreshInProgress.current.delete(refreshKey);
    }
  }, [refreshJobs, clearError, setError]);

  return { performRefresh };
};
