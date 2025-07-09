import { useEffect, useRef, useCallback } from 'react';
import { memoryLeakPreventer, trackTimeout, trackInterval, trackFetch, trackEventListener } from '@/lib/performance/memoryLeakPrevention';

/**
 * MEMORY LEAK PREVENTION HOOK
 * Automatically tracks and cleans up operations
 */
export const useMemoryLeakPrevention = () => {
  const componentIdRef = useRef(`component_${Math.random().toString(36)}`);
  const operationCountRef = useRef(0);

  // Create scoped operation ID
  const createOperationId = useCallback(() => {
    operationCountRef.current += 1;
    return `${componentIdRef.current}_${operationCountRef.current}`;
  }, []);

  // Tracked timeout
  const safeSetTimeout = useCallback((callback: () => void, delay: number) => {
    const id = createOperationId();
    const timeoutId = setTimeout(() => {
      callback();
      memoryLeakPreventer.unregisterOperation(id);
    }, delay);
    
    memoryLeakPreventer.registerOperation(id, 'timer', () => {
      clearTimeout(timeoutId);
    });
    
    return timeoutId;
  }, [createOperationId]);

  // Tracked interval
  const safeSetInterval = useCallback((callback: () => void, delay: number) => {
    const id = createOperationId();
    const intervalId = setInterval(callback, delay);
    
    memoryLeakPreventer.registerOperation(id, 'interval', () => {
      clearInterval(intervalId);
    });
    
    return intervalId;
  }, [createOperationId]);

  // Tracked fetch
  const safeFetch = useCallback((input: RequestInfo | URL, init?: RequestInit) => {
    const id = createOperationId();
    const controller = new AbortController();
    
    const fetchPromise = fetch(input, {
      ...init,
      signal: controller.signal
    });
    
    memoryLeakPreventer.registerOperation(id, 'fetch', () => {
      controller.abort();
    });
    
    return fetchPromise.finally(() => {
      memoryLeakPreventer.unregisterOperation(id);
    });
  }, [createOperationId]);

  // Tracked event listener
  const safeAddEventListener = useCallback((
    element: EventTarget,
    event: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ) => {
    const id = createOperationId();
    
    element.addEventListener(event, listener, options);
    
    memoryLeakPreventer.registerOperation(id, 'eventListener', () => {
      element.removeEventListener(event, listener, options);
    });

    return () => memoryLeakPreventer.unregisterOperation(id);
  }, [createOperationId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up all operations for this component
      const stats = memoryLeakPreventer.getStats();
      const componentOperations = Array.from((memoryLeakPreventer as any).operations.keys())
        .filter((id: unknown) => typeof id === 'string' && id.startsWith(componentIdRef.current));
      
      componentOperations.forEach((id: unknown) => {
        if (typeof id === 'string') {
          memoryLeakPreventer.unregisterOperation(id);
        }
      });

      if (componentOperations.length > 0) {
        console.log(`[MEMORY LEAK PREVENTION] Cleaned up ${componentOperations.length} operations for component ${componentIdRef.current}`);
      }
    };
  }, []);

  return {
    safeSetTimeout,
    safeSetInterval,
    safeFetch,
    safeAddEventListener,
    getOperationStats: () => memoryLeakPreventer.getStats(),
    forceCleanup: () => memoryLeakPreventer.forceCleanupAll()
  };
};