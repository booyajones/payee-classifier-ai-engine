import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { productionLogger } from '@/lib/logging/productionLogger';

interface MemoryCleanupOptions {
  maxCompletedJobs: number;
  maxJobAgeHours: number;
  cleanupIntervalMs: number;
}

const DEFAULT_OPTIONS: MemoryCleanupOptions = {
  maxCompletedJobs: 20, // Keep at most 20 completed jobs
  maxJobAgeHours: 72,   // Clean up jobs older than 3 days
  cleanupIntervalMs: 10 * 60 * 1000 // Clean up every 10 minutes
};

export class MemoryManager {
  private cleanupTimer: NodeJS.Timeout | null = null;
  private options: MemoryCleanupOptions;
  private onJobsUpdated: (jobs: BatchJob[]) => void;

  constructor(
    onJobsUpdated: (jobs: BatchJob[]) => void,
    options: Partial<MemoryCleanupOptions> = {}
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.onJobsUpdated = onJobsUpdated;
    this.startCleanupTimer();
  }

  private startCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      // This will be called by the component when needed
      // We don't have direct access to jobs here, so this is just a placeholder
      productionLogger.debug('[MEMORY MANAGER] Cleanup timer triggered', undefined, 'MEMORY');
    }, this.options.cleanupIntervalMs);
  }

  cleanupJobs(jobs: BatchJob[]): BatchJob[] {
    const now = Date.now();
    const maxAgeMs = this.options.maxJobAgeHours * 60 * 60 * 1000;

    // Separate active and completed jobs
    const activeJobs = jobs.filter(job => 
      ['validating', 'in_progress', 'finalizing'].includes(job.status)
    );
    
    const completedJobs = jobs.filter(job => 
      ['completed', 'failed', 'cancelled', 'expired'].includes(job.status)
    );

    // Keep all active jobs
    let cleanedJobs = [...activeJobs];

    // Clean up old completed jobs
    const recentCompletedJobs = completedJobs.filter(job => {
      const jobAge = now - new Date(job.created_at * 1000).getTime();
      return jobAge <= maxAgeMs;
    });

    // Keep only the most recent completed jobs up to the limit
    const sortedRecentCompleted = recentCompletedJobs
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, this.options.maxCompletedJobs);

    cleanedJobs.push(...sortedRecentCompleted);

    const removedCount = jobs.length - cleanedJobs.length;
    if (removedCount > 0) {
      productionLogger.info(`[MEMORY MANAGER] Cleaned up ${removedCount} old jobs`, {
        totalJobs: jobs.length,
        remainingJobs: cleanedJobs.length,
        activeJobs: activeJobs.length,
        completedJobs: sortedRecentCompleted.length
      }, 'MEMORY');
    }

    return cleanedJobs;
  }

  performGarbageCollection() {
    // Force garbage collection if available (development only)
    if (typeof window !== 'undefined' && (window as any).gc) {
      try {
        (window as any).gc();
        productionLogger.debug('[MEMORY MANAGER] Manual garbage collection triggered', undefined, 'MEMORY');
      } catch (error) {
        productionLogger.warn('[MEMORY MANAGER] Manual garbage collection failed', error, 'MEMORY');
      }
    }
  }

  getMemoryUsage(): { used: number; total: number; percentage: number } | null {
    try {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        return {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
          percentage: Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100)
        };
      }
    } catch (error) {
      productionLogger.warn('[MEMORY MANAGER] Memory usage unavailable', error, 'MEMORY');
    }
    return null;
  }

  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// React hook for memory management
export const useMemoryManager = (
  jobs: BatchJob[],
  onJobsUpdated: (jobs: BatchJob[]) => void,
  options: Partial<MemoryCleanupOptions> = {}
) => {
  const managerRef = React.useRef<MemoryManager | null>(null);

  React.useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = new MemoryManager(onJobsUpdated, options);
    }

    // Perform cleanup on job changes
    const cleanedJobs = managerRef.current.cleanupJobs(jobs);
    if (cleanedJobs.length !== jobs.length) {
      onJobsUpdated(cleanedJobs);
    }

    return () => {
      if (managerRef.current) {
        managerRef.current.destroy();
        managerRef.current = null;
      }
    };
  }, [jobs, onJobsUpdated, options]);

  const forceCleanup = React.useCallback(() => {
    if (managerRef.current) {
      const cleanedJobs = managerRef.current.cleanupJobs(jobs);
      onJobsUpdated(cleanedJobs);
      managerRef.current.performGarbageCollection();
    }
  }, [jobs, onJobsUpdated]);

  const getMemoryUsage = React.useCallback(() => {
    return managerRef.current?.getMemoryUsage() || null;
  }, []);

  return { forceCleanup, getMemoryUsage };
};

// Import React for the hook
import React from 'react';
