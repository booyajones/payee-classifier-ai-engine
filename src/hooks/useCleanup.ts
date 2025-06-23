
import { useEffect, useRef } from 'react';

export const useCleanup = () => {
  const cleanupFunctions = useRef<(() => void)[]>([]);

  const addCleanup = (fn: () => void) => {
    cleanupFunctions.current.push(fn);
  };

  const cleanup = () => {
    cleanupFunctions.current.forEach(fn => {
      try {
        fn();
      } catch (error) {
        console.error('[CLEANUP] Error during cleanup:', error);
      }
    });
    cleanupFunctions.current = [];
  };

  useEffect(() => {
    return cleanup;
  }, []);

  return { addCleanup, cleanup };
};

export const useMemoryOptimization = () => {
  const performanceObserver = useRef<PerformanceObserver | null>(null);

  useEffect(() => {
    // Monitor memory usage if available
    if ('performance' in window && 'memory' in (window.performance as any)) {
      const logMemoryUsage = () => {
        const memory = (window.performance as any).memory;
        const usedPercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        
        if (usedPercent > 80) {
          console.warn('[MEMORY] High memory usage detected:', usedPercent.toFixed(1) + '%');
        }
      };

      const interval = setInterval(logMemoryUsage, 30000); // Check every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, []);

  const forceGarbageCollection = () => {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  };

  return { forceGarbageCollection };
};
