import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  renderCount: number;
  memoryUsage: number;
  isStable: boolean;
  warnings: string[];
}

/**
 * Gentle performance monitoring that doesn't cause the problems it's trying to solve
 */
export const useStablePerformanceMonitor = () => {
  const renderCountRef = useRef(0);
  const lastResetRef = useRef(Date.now());
  const warningsRef = useRef<string[]>([]);
  const memoryCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Very conservative render tracking
  useEffect(() => {
    renderCountRef.current += 1;
    
    const now = Date.now();
    const timeSinceReset = now - lastResetRef.current;
    
    // Only warn if we have excessive renders in a short time period
    if (renderCountRef.current > 50 && timeSinceReset < 5000) {
      const warning = `High render frequency detected: ${renderCountRef.current} renders in ${timeSinceReset}ms`;
      console.warn('[PERFORMANCE MONITOR]', warning);
      warningsRef.current.push(warning);
      
      // Keep warnings list manageable
      if (warningsRef.current.length > 5) {
        warningsRef.current = warningsRef.current.slice(-3);
      }
    }
    
    // Reset counter every 10 seconds
    if (timeSinceReset > 10000) {
      renderCountRef.current = 0;
      lastResetRef.current = now;
    }
  });

  const checkMemoryUsage = useCallback((): number => {
    if (typeof window === 'undefined' || !('memory' in performance)) {
      return 0;
    }
    
    try {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    } catch {
      return 0;
    }
  }, []);

  const getMetrics = useCallback((): PerformanceMetrics => {
    const memoryUsage = checkMemoryUsage();
    const isStable = renderCountRef.current < 30 && memoryUsage < 0.8;
    
    return {
      renderCount: renderCountRef.current,
      memoryUsage,
      isStable,
      warnings: [...warningsRef.current]
    };
  }, [checkMemoryUsage]);

  const clearWarnings = useCallback(() => {
    warningsRef.current = [];
  }, []);

  // Gentle memory monitoring every 60 seconds
  useEffect(() => {
    memoryCheckIntervalRef.current = setInterval(() => {
      const memoryUsage = checkMemoryUsage();
      if (memoryUsage > 0.9) {
        const warning = `High memory usage: ${(memoryUsage * 100).toFixed(1)}%`;
        console.warn('[PERFORMANCE MONITOR]', warning);
        warningsRef.current.push(warning);
      }
    }, 60000);

    return () => {
      if (memoryCheckIntervalRef.current) {
        clearInterval(memoryCheckIntervalRef.current);
      }
    };
  }, [checkMemoryUsage]);

  return {
    getMetrics,
    clearWarnings,
    isStable: getMetrics().isStable
  };
};
