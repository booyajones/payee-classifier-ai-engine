import { ENV_CONFIG } from '@/lib/config/environmentConfig';
import { productionLogger } from '@/lib/logging';
import { useProductionStore } from '@/stores/productionStore';

/**
 * Production performance optimization utilities
 */

// Debounce utility for high-frequency operations
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number = ENV_CONFIG.performance.debounceMs
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility for limiting function calls
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number = ENV_CONFIG.performance.logThrottleMs
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Batch processing utility
export function createBatchProcessor<T>(
  processor: (items: T[]) => Promise<void>,
  batchSize: number = ENV_CONFIG.performance.batchSize
) {
  let batch: T[] = [];
  let timeout: NodeJS.Timeout;

  const processBatch = async () => {
    if (batch.length === 0) return;
    
    const currentBatch = [...batch];
    batch = [];
    
    try {
      await processor(currentBatch);
      productionLogger.performance.end('batch-processing', performance.now(), 'BATCH_PROCESSOR');
    } catch (error) {
      productionLogger.error('Batch processing failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        batchSize: currentBatch.length 
      }, 'BATCH_PROCESSOR');
    }
  };

  return {
    add: (item: T) => {
      batch.push(item);
      
      if (batch.length >= batchSize) {
        processBatch();
      } else {
        clearTimeout(timeout);
        timeout = setTimeout(processBatch, 100);
      }
    },
    
    flush: processBatch,
    
    size: () => batch.length
  };
}

// Memory optimization utilities
export const memoryOptimizer = {
  // Clean up objects for garbage collection
  cleanup: (obj: any) => {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        if (obj[key] && typeof obj[key] === 'object') {
          delete obj[key];
        }
      });
    }
  },

  // Monitor memory usage
  checkMemoryUsage: () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
      const percentage = (usedMB / limitMB) * 100;
      
      // Update production store with metrics
      useProductionStore.getState().updateRuntimeMetrics({
        memoryUsage: percentage
      });

      if (percentage > 80) {
        productionLogger.warn('High memory usage detected', {
          usedMB: usedMB.toFixed(2),
          limitMB: limitMB.toFixed(2),
          percentage: percentage.toFixed(1)
        }, 'MEMORY_OPTIMIZER');
        
        // Trigger garbage collection if available
        if ('gc' in window) {
          (window as any).gc();
        }
      }
      
      return { usedMB, limitMB, percentage };
    }
    return null;
  },

  // Optimize large arrays
  chunkArray: <T>(array: T[], chunkSize: number = ENV_CONFIG.performance.batchSize): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
};

// Cache management
export class ProductionCache<T> {
  private cache = new Map<string, { data: T; timestamp: number; hits: number }>();
  private maxSize = ENV_CONFIG.performance.cacheSize;
  private ttl = 5 * 60 * 1000; // 5 minutes default

  set(key: string, data: T, customTtl?: number): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count
    entry.hits++;
    
    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalHits,
      averageHits: entries.length > 0 ? totalHits / entries.length : 0
    };
  }
}

// Global caches for common data
export const classificationCache = new ProductionCache<any>();
export const fileCache = new ProductionCache<any>();

// Performance monitoring hook
export function usePerformanceMonitor() {
  const metrics = useProductionStore((state) => state.runtime.performanceMetrics);
  const enabled = useProductionStore((state) => state.userPreferences.enablePerformanceMonitoring);

  const startTiming = (operation: string) => {
    if (!enabled) return null;
    return performance.now();
  };

  const endTiming = (operation: string, startTime: number | null) => {
    if (!enabled || !startTime) return;
    
    const duration = performance.now() - startTime;
    
    // Update metrics in store
    useProductionStore.getState().updateRuntimeMetrics({
      lastClassificationTime: duration,
      averageProcessingTime: (metrics.averageProcessingTime + duration) / 2
    });

    productionLogger.performance.end(operation, duration, 'PERFORMANCE_MONITOR');
  };

  return { startTiming, endTiming, metrics };
}

// Periodic cleanup and optimization
if (ENV_CONFIG.isProduction) {
  setInterval(() => {
    memoryOptimizer.checkMemoryUsage();
    
    // Clean up expired cache entries
    classificationCache.clear();
    fileCache.clear();
    
    productionLogger.debug('Periodic cleanup completed', null, 'PERFORMANCE_OPTIMIZER');
  }, 5 * 60 * 1000); // Every 5 minutes
}