import React, { useCallback, useEffect, useRef, useState } from 'react';
import { debounce } from 'lodash-es';

interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercentage: number;
}

interface OptimizationSettings {
  cleanupThreshold: number; // Memory percentage threshold for cleanup
  maxCacheSize: number;
  gcInterval: number; // Garbage collection check interval (ms)
}

export const useMemoryOptimization = (settings: Partial<OptimizationSettings> = {}) => {
  const defaultSettings: OptimizationSettings = {
    cleanupThreshold: 80,
    maxCacheSize: 100,
    gcInterval: 30000, // 30 seconds
    ...settings
  };

  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const cacheRefs = useRef(new Map<string, any>());
  const cleanupCallbacks = useRef<Array<() => void>>([]);

  // Get current memory usage
  const getMemoryStats = useCallback((): MemoryStats | null => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usagePercentage: Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100)
      };
    }
    return null;
  }, []);

  // Force garbage collection if available
  const forceGarbageCollection = useCallback(() => {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
      console.log('[MEMORY] Manual garbage collection triggered');
    }
  }, []);

  // Optimize memory by cleaning up caches and triggering GC
  const optimizeMemory = useCallback(async () => {
    setIsOptimizing(true);
    
    try {
      // Clear internal caches
      cacheRefs.current.clear();
      
      // Execute cleanup callbacks
      cleanupCallbacks.current.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.warn('[MEMORY] Cleanup callback failed:', error);
        }
      });

      // Force garbage collection
      forceGarbageCollection();

      // Clear URL object cache
      if ('revokeObjectURL' in URL) {
        // Note: We can't access all URLs, but we can ensure proper cleanup in our code
      }

      // Update memory stats
      const stats = getMemoryStats();
      if (stats) {
        setMemoryStats(stats);
      }

      console.log('[MEMORY] Memory optimization completed');
    } finally {
      setIsOptimizing(false);
    }
  }, [forceGarbageCollection, getMemoryStats]);

  // Debounced memory check
  const checkMemoryUsage = useCallback(
    debounce(() => {
      const stats = getMemoryStats();
      if (!stats) return;

      setMemoryStats(stats);

      // Auto-optimize if usage is too high
      if (stats.usagePercentage >= defaultSettings.cleanupThreshold) {
        console.warn(`[MEMORY] High memory usage detected: ${stats.usagePercentage}%`);
        optimizeMemory();
      }
    }, 1000),
    [getMemoryStats, optimizeMemory, defaultSettings.cleanupThreshold]
  );

  // Register cleanup callback
  const registerCleanup = useCallback((callback: () => void) => {
    cleanupCallbacks.current.push(callback);
    
    return () => {
      const index = cleanupCallbacks.current.indexOf(callback);
      if (index > -1) {
        cleanupCallbacks.current.splice(index, 1);
      }
    };
  }, []);

  // Memoized cache with size limit
  const memoizeWithLimit = useCallback(<T, K extends string>(
    key: K,
    factory: () => T,
    maxSize = defaultSettings.maxCacheSize
  ): T => {
    if (cacheRefs.current.has(key)) {
      return cacheRefs.current.get(key);
    }

    // Cleanup cache if too large
    if (cacheRefs.current.size >= maxSize) {
      const entries = Array.from(cacheRefs.current.entries());
      const toDelete = Math.floor(maxSize * 0.3); // Remove 30% of entries
      entries.slice(0, toDelete).forEach(([k]) => {
        cacheRefs.current.delete(k);
      });
    }

    const value = factory();
    cacheRefs.current.set(key, value);
    return value;
  }, [defaultSettings.maxCacheSize]);

  // Memory-efficient data processor for large arrays
  const processInChunks = useCallback(async <T, R>(
    data: T[],
    processor: (chunk: T[], startIndex: number) => Promise<R[]>,
    chunkSize = 100,
    delay = 10
  ): Promise<R[]> => {
    const results: R[] = [];
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const chunkResults = await processor(chunk, i);
      results.push(...chunkResults);
      
      // Allow UI to breathe and check memory
      if (i + chunkSize < data.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
        checkMemoryUsage();
      }
    }
    
    return results;
  }, [checkMemoryUsage]);

  // Automatic memory monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      checkMemoryUsage();
    }, defaultSettings.gcInterval);

    return () => clearInterval(interval);
  }, [checkMemoryUsage, defaultSettings.gcInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cacheRefs.current.clear();
      cleanupCallbacks.current = [];
    };
  }, []);

  return {
    memoryStats,
    isOptimizing,
    optimizeMemory,
    registerCleanup,
    memoizeWithLimit,
    processInChunks,
    forceGarbageCollection,
    checkMemoryUsage
  };
};

export interface MemoryMonitorProps {
  onOptimize?: () => void;
  threshold?: number;
}

export const MemoryMonitor: React.FC<MemoryMonitorProps> = ({ 
  onOptimize,
  threshold = 80 
}) => {
  const { memoryStats, isOptimizing, optimizeMemory } = useMemoryOptimization({ 
    cleanupThreshold: threshold 
  });

  const handleOptimize = React.useCallback(() => {
    optimizeMemory();
    onOptimize?.();
  }, [optimizeMemory, onOptimize]);

  if (!memoryStats) {
    return null;
  }

  const isHighUsage = memoryStats.usagePercentage >= threshold;

  return React.createElement('div', {
    className: `p-3 rounded-md border ${isHighUsage ? 'border-destructive bg-destructive/10' : 'border-border'}`
  }, [
    React.createElement('div', {
      key: 'content',
      className: 'flex items-center justify-between'
    }, [
      React.createElement('div', {
        key: 'stats',
        className: 'text-sm'
      }, [
        React.createElement('div', {
          key: 'title',
          className: 'font-medium'
        }, 'Memory Usage'),
        React.createElement('div', {
          key: 'usage',
          className: 'text-muted-foreground'
        }, `${memoryStats.usagePercentage}% (${(memoryStats.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB)`)
      ]),
      
      isHighUsage && React.createElement('button', {
        key: 'optimize-btn',
        onClick: handleOptimize,
        disabled: isOptimizing,
        className: 'px-3 py-1 text-xs bg-destructive text-destructive-foreground rounded disabled:opacity-50'
      }, isOptimizing ? 'Optimizing...' : 'Optimize')
    ]),
    
    React.createElement('div', {
      key: 'progress-container',
      className: 'mt-2 w-full bg-muted rounded-full h-2'
    }, React.createElement('div', {
      className: `h-2 rounded-full transition-all ${
        isHighUsage ? 'bg-destructive' : 'bg-primary'
      }`,
      style: { width: `${Math.min(memoryStats.usagePercentage, 100)}%` }
    }))
  ]);
};