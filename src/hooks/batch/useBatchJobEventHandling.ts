
import { useEffect, useRef } from 'react';
import { useBatchJobEventListener, emitBatchJobUpdate } from './useBatchJobEventEmitter';
import { handleError } from '@/lib/errorHandler';

export const useBatchJobEventHandling = (
  refreshJobs: (silent?: boolean) => Promise<void>,
  setError: (key: string, error: string) => void
) => {
  const eventListenerActive = useRef(false);

  useEffect(() => {
    const handleJobUpdate = async () => {
      if (eventListenerActive.current) {
        console.log('[EVENT HANDLING] Event handler already active, skipping...');
        return;
      }

      eventListenerActive.current = true;
      
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log('[EVENT HANDLING] Received job update event, refreshing jobs...');
        await refreshJobs(true);
      } catch (error) {
        console.error('[EVENT HANDLING] Error during event-triggered refresh:', error);
        const appError = handleError(error, 'Event-triggered refresh');
        setError('refresh', appError.message);
      } finally {
        eventListenerActive.current = false;
      }
    };

    const unsubscribe = useBatchJobEventListener(handleJobUpdate);
    return unsubscribe;
  }, [refreshJobs, setError]);

  return { emitBatchJobUpdate };
};
