import { useEffect, useRef, useCallback } from 'react';
import { useCleanup } from '@/lib/utils/cleanupManager';
import { productionLogger } from '@/lib/logging/productionLogger';

interface PollingOptions {
  interval: number;
  maxRetries?: number;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

/**
 * Memory-optimized polling hook with automatic cleanup
 */
export function useMemoryOptimizedPolling(
  callback: () => Promise<void> | void,
  options: PollingOptions
) {
  const { addCleanup } = useCleanup();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);
  const retryCountRef = useRef(0);
  const callbackRef = useRef(callback);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isActiveRef.current = false;
    retryCountRef.current = 0;
  }, []);

  const executeCallback = useCallback(async () => {
    if (!isActiveRef.current) return;

    try {
      await callbackRef.current();
      retryCountRef.current = 0; // Reset retry count on success
    } catch (error) {
      retryCountRef.current++;
      
      if (options.maxRetries && retryCountRef.current >= options.maxRetries) {
        productionLogger.error('Polling stopped due to max retries', { error, retries: retryCountRef.current }, 'POLLING');
        cleanup();
        return;
      }

      if (options.onError) {
        options.onError(error as Error);
      } else {
        productionLogger.warn('Polling callback error', error, 'POLLING');
      }
    }
  }, [options, cleanup]);

  const startPolling = useCallback(() => {
    if (isActiveRef.current || !options.enabled) return;

    isActiveRef.current = true;
    retryCountRef.current = 0;

    // Execute immediately
    executeCallback();

    // Set up interval
    intervalRef.current = setInterval(executeCallback, options.interval);
    
    // Register cleanup
    const cleanupId = `polling-${Date.now()}-${Math.random()}`;
    addCleanup(cleanupId, cleanup, 'interval');

    productionLogger.debug('Started memory-optimized polling', { interval: options.interval }, 'POLLING');
  }, [executeCallback, options.enabled, options.interval, addCleanup, cleanup]);

  const stopPolling = useCallback(() => {
    cleanup();
    productionLogger.debug('Stopped memory-optimized polling', undefined, 'POLLING');
  }, [cleanup]);

  // Auto-start/stop based on enabled state
  useEffect(() => {
    if (options.enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return stopPolling;
  }, [options.enabled, startPolling, stopPolling]);

  return {
    isActive: isActiveRef.current,
    retryCount: retryCountRef.current,
    startPolling,
    stopPolling
  };
}
