import { useCallback, useEffect, useRef } from 'react';
import { useBatchJobStore } from '@/stores/batchJobStore';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { productionLogger } from '@/lib/logging/productionLogger';

interface CleanupConfig {
  memoryThreshold: number;
  maxJobs: number;
  cleanupInterval: number;
  maxOldJobs: number;
}

const DEFAULT_CONFIG: CleanupConfig = {
  memoryThreshold: 80,
  maxJobs: 50,
  cleanupInterval: 10 * 60 * 1000, // 10 minutes
  maxOldJobs: 10
};

/**
 * Unified cleanup hook that consolidates all cleanup operations
 * Replaces: useCleanup, useAutomaticJobCleanup, usePerformanceCleanup, useMemoryOptimization
 */
export const useUnifiedCleanup = (config: Partial<CleanupConfig> = {}) => {
  const settings = { ...DEFAULT_CONFIG, ...config };
  const { jobs, removeJob, updateJob } = useBatchJobStore();
  
  const cleanupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastCleanupRef = useRef<number>(0);
  const cleanupCallbacks = useRef<(() => void)[]>([]);

  // Register cleanup callback
  const registerCleanup = useCallback((cleanup: () => void) => {
    cleanupCallbacks.current.push(cleanup);
    return () => {
      const index = cleanupCallbacks.current.indexOf(cleanup);
      if (index > -1) {
        cleanupCallbacks.current.splice(index, 1);
      }
    };
  }, []);

  // Get memory stats
  const getMemoryStats = useCallback(() => {
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
        productionLogger.debug('Manual garbage collection triggered', undefined, 'CLEANUP');
      } catch (e) {
        // Ignore GC errors
      }
    }
  }, []);

  // Clean localStorage
  const cleanLocalStorage = useCallback(() => {
    try {
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.includes('polling-state') || 
        key.includes('performance-cache') ||
        key.includes('temp-') ||
        key.includes('batch-job-') ||
        key.includes('job-polling-')
      );
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      productionLogger.debug(`Cleaned ${keysToRemove.length} localStorage entries`, undefined, 'CLEANUP');
    } catch (e) {
      productionLogger.warn('localStorage cleanup failed', e, 'CLEANUP');
    }
  }, []);

  // Clean old and stalled jobs
  const cleanJobs = useCallback(() => {
    const now = Date.now();
    let removedCount = 0;
    let stalledCount = 0;
    
    jobs.forEach(job => {
      const jobAge = now - new Date(job.created_at * 1000).getTime();
      const isAncient = jobAge > 48 * 60 * 60 * 1000; // 48+ hours
      const isVeryOld = jobAge > 24 * 60 * 60 * 1000; // 24+ hours
      
      // Remove ancient completed jobs
      if (isAncient && ['completed', 'failed', 'cancelled', 'expired'].includes(job.status)) {
        removeJob(job.id);
        removedCount++;
        return;
      }
      
      // Auto-expire stalled jobs
      if (isVeryOld && ['validating', 'in_progress', 'finalizing'].includes(job.status)) {
        const hasProgress = job.request_counts.completed > 0;
        const progressRatio = job.request_counts.completed / job.request_counts.total;
        
        const shouldExpire = (!hasProgress && jobAge > 24 * 60 * 60 * 1000) || 
                           (hasProgress && progressRatio < 0.01 && jobAge > 48 * 60 * 60 * 1000);
        
        if (shouldExpire) {
          const expiredJob: BatchJob = {
            ...job,
            status: 'expired',
            expired_at: Math.floor(now / 1000)
          };
          updateJob(expiredJob);
          stalledCount++;
        }
      }
    });
    
    return { removedCount, stalledCount };
  }, [jobs, removeJob, updateJob]);

  // Main cleanup function
  const performCleanup = useCallback(() => {
    const now = Date.now();
    
    // Don't run too frequently
    if (now - lastCleanupRef.current < 5 * 60 * 1000) {
      return;
    }
    
    lastCleanupRef.current = now;
    
    try {
      // Get memory stats before cleanup
      const memoryBefore = getMemoryStats();
      
      // Clean jobs
      const { removedCount, stalledCount } = cleanJobs();
      
      // Clean localStorage if memory is high or we have too many jobs
      const shouldCleanStorage = (memoryBefore?.usagePercentage || 0) > settings.memoryThreshold || 
                                jobs.length > settings.maxJobs;
      
      if (shouldCleanStorage) {
        cleanLocalStorage();
      }
      
      // Execute registered cleanup callbacks
      cleanupCallbacks.current.forEach(callback => {
        try {
          callback();
        } catch (error) {
          productionLogger.warn('Cleanup callback failed', error, 'CLEANUP');
        }
      });
      
      // Force GC if needed
      if (shouldCleanStorage || jobs.length > settings.maxJobs) {
        forceGarbageCollection();
      }
      
      // Log results
      if (removedCount > 0 || stalledCount > 0 || shouldCleanStorage) {
        const memoryAfter = getMemoryStats();
        productionLogger.info('Cleanup completed', {
          removedJobs: removedCount,
          stalledJobs: stalledCount,
          cleanedStorage: shouldCleanStorage,
          memoryBefore: memoryBefore?.usagePercentage,
          memoryAfter: memoryAfter?.usagePercentage,
          totalJobs: jobs.length
        }, 'CLEANUP');
      }
      
    } catch (error) {
      productionLogger.error('Cleanup failed', error, 'CLEANUP');
    }
  }, [jobs, settings, getMemoryStats, cleanJobs, cleanLocalStorage, forceGarbageCollection]);

  // Force cleanup for emergency situations
  const forceCleanup = useCallback(() => {
    productionLogger.info('Force cleanup initiated', undefined, 'CLEANUP');
    lastCleanupRef.current = 0; // Reset timer to allow immediate cleanup
    performCleanup();
  }, [performCleanup]);

  // Setup automatic cleanup timer
  useEffect(() => {
    // Initial cleanup after 30 seconds
    const initialTimeout = setTimeout(performCleanup, 30000);
    
    // Regular cleanup interval
    cleanupTimerRef.current = setInterval(performCleanup, settings.cleanupInterval);
    
    return () => {
      clearTimeout(initialTimeout);
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current);
      }
    };
  }, [performCleanup, settings.cleanupInterval]);

  // Emergency cleanup when too many jobs
  useEffect(() => {
    if (jobs.length > settings.maxJobs) {
      productionLogger.warn(`Too many jobs detected: ${jobs.length}`, undefined, 'CLEANUP');
      forceCleanup();
    }
  }, [jobs.length, settings.maxJobs, forceCleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupCallbacks.current = [];
    };
  }, []);

  return {
    performCleanup,
    forceCleanup,
    registerCleanup,
    getMemoryStats,
    forceGarbageCollection
  };
};