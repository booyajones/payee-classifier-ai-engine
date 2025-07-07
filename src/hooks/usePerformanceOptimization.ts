import { useEffect, useCallback, useRef, useState } from 'react';
import { debounce } from 'lodash-es';

export interface PerformanceMetrics {
  memoryUsage: number;
  renderTime: number;
  lastUpdate: Date;
  totalUpdates: number;
  avgRenderTime: number;
}

export const usePerformanceOptimization = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memoryUsage: 0,
    renderTime: 0,
    lastUpdate: new Date(),
    totalUpdates: 0,
    avgRenderTime: 0
  });

  const renderStartTime = useRef<number>(0);
  const renderTimes = useRef<number[]>([]);

  // Memory monitoring
  const getMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100);
    }
    return 0;
  }, []);

  // Debounced performance tracking
  const trackPerformance = useCallback(
    debounce(() => {
      const memoryUsage = getMemoryUsage();
      const now = performance.now();
      const renderTime = renderStartTime.current > 0 ? now - renderStartTime.current : 0;
      
      if (renderTime > 0) {
        renderTimes.current.push(renderTime);
        // Keep only last 100 measurements
        if (renderTimes.current.length > 100) {
          renderTimes.current = renderTimes.current.slice(-100);
        }
      }

      const avgRenderTime = renderTimes.current.length > 0
        ? renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length
        : 0;

      setMetrics(prev => ({
        memoryUsage,
        renderTime,
        lastUpdate: new Date(),
        totalUpdates: prev.totalUpdates + 1,
        avgRenderTime: Math.round(avgRenderTime * 100) / 100
      }));
    }, 100),
    [getMemoryUsage]
  );

  // Component render tracking
  const startRenderTracking = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const endRenderTracking = useCallback(() => {
    trackPerformance();
  }, [trackPerformance]);

  // Memory cleanup utilities
  const cleanupMemory = useCallback(() => {
    // Force garbage collection if available (Chrome DevTools)
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
    
    // Clear render time history
    renderTimes.current = [];
    
    console.log('[PERFORMANCE] Memory cleanup executed');
  }, []);

  // Virtualization helpers
  const getVirtualizationConfig = useCallback((totalItems: number, itemHeight: number = 50) => {
    const viewportHeight = window.innerHeight;
    const visibleItems = Math.ceil(viewportHeight / itemHeight);
    const bufferSize = Math.min(20, Math.ceil(visibleItems * 0.5));
    
    return {
      height: Math.min(viewportHeight * 0.7, totalItems * itemHeight),
      itemHeight,
      visibleItems,
      bufferSize,
      overscan: bufferSize
    };
  }, []);

  // Batch processing helper
  const batchProcess = useCallback(async <T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    batchSize: number = 50,
    delay: number = 10
  ): Promise<R[]> => {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((item, index) => processor(item, i + index))
      );
      
      results.push(...batchResults);
      
      // Allow UI to update between batches
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return results;
  }, []);

  // Memoization helper
  const createMemoizedSelector = useCallback(<T, R>(
    selector: (data: T) => R,
    dependencies: any[] = []
  ) => {
    const cache = useRef<{ data: T; result: R; deps: any[] } | null>(null);
    
    return (data: T): R => {
      if (
        !cache.current ||
        cache.current.data !== data ||
        !dependencies.every((dep, index) => dep === cache.current!.deps[index])
      ) {
        cache.current = {
          data,
          result: selector(data),
          deps: [...dependencies]
        };
      }
      
      return cache.current.result;
    };
  }, []);

  // Performance warning thresholds
  const getPerformanceWarnings = useCallback(() => {
    const warnings: string[] = [];
    
    if (metrics.memoryUsage > 80) {
      warnings.push(`High memory usage: ${metrics.memoryUsage}%`);
    }
    
    if (metrics.avgRenderTime > 16) {
      warnings.push(`Slow renders: ${metrics.avgRenderTime}ms (target: <16ms)`);
    }
    
    if (renderTimes.current.some(time => time > 100)) {
      warnings.push('Detected slow renders over 100ms');
    }
    
    return warnings;
  }, [metrics]);

  // Automatic performance monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      const memoryUsage = getMemoryUsage();
      setMetrics(prev => ({
        ...prev,
        memoryUsage,
        lastUpdate: new Date()
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, [getMemoryUsage]);

  return {
    metrics,
    startRenderTracking,
    endRenderTracking,
    cleanupMemory,
    getVirtualizationConfig,
    batchProcess,
    createMemoizedSelector,
    getPerformanceWarnings,
    trackPerformance
  };
};
