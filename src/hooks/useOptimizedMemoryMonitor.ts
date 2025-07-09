import { useCallback, useEffect, useRef, useState } from 'react';
import { debounce } from 'lodash-es';

interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  usagePercentage: number;
}

interface MemoryConfig {
  checkInterval: number;
  threshold: number;
  debounceMs: number;
}

const DEFAULT_CONFIG: MemoryConfig = {
  checkInterval: 60000, // 1 minute
  threshold: 80,
  debounceMs: 1000
};

/**
 * Optimized memory monitor that replaces multiple memory-related hooks
 * Consolidates useMemoryOptimization functionality with better performance
 */
export const useOptimizedMemoryMonitor = (config: Partial<MemoryConfig> = {}) => {
  const settings = { ...DEFAULT_CONFIG, ...config };
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get current memory usage
  const getMemoryStats = useCallback((): MemoryStats | null => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        usagePercentage: Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100)
      };
    }
    return null;
  }, []);

  // Force garbage collection
  const forceGarbageCollection = useCallback(() => {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      try {
        (window as any).gc();
        console.log('[MEMORY] Manual garbage collection triggered');
      } catch (e) {
        // Ignore GC errors in production
      }
    }
  }, []);

  // Optimized memory cleanup
  const optimizeMemory = useCallback(async () => {
    if (isOptimizing) return;
    
    setIsOptimizing(true);
    
    try {
      // Force garbage collection
      forceGarbageCollection();
      
      // Update memory stats after optimization
      const stats = getMemoryStats();
      if (stats) {
        setMemoryStats(stats);
      }
      
      console.log('[MEMORY] Memory optimization completed');
    } finally {
      setIsOptimizing(false);
    }
  }, [isOptimizing, forceGarbageCollection, getMemoryStats]);

  // Debounced memory check to prevent excessive calls
  const checkMemoryUsage = useCallback(
    debounce(() => {
      const stats = getMemoryStats();
      if (!stats) return;

      setMemoryStats(stats);

      // Auto-optimize if usage is too high
      if (stats.usagePercentage >= settings.threshold && !isOptimizing) {
        console.warn(`[MEMORY] High memory usage detected: ${stats.usagePercentage}%`);
        optimizeMemory();
      }
    }, settings.debounceMs),
    [getMemoryStats, optimizeMemory, settings.threshold, settings.debounceMs, isOptimizing]
  );

  // Setup memory monitoring
  useEffect(() => {
    // Initial check
    checkMemoryUsage();
    
    // Setup interval
    intervalRef.current = setInterval(checkMemoryUsage, settings.checkInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkMemoryUsage, settings.checkInterval]);

  return {
    memoryStats,
    isOptimizing,
    optimizeMemory,
    forceGarbageCollection,
    checkMemoryUsage: checkMemoryUsage.flush // Expose immediate check function
  };
};