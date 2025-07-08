import { useEffect, useRef, useCallback } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { useBatchJobStore } from '@/stores/batchJobStore';
import { productionLogger } from '@/lib/logging/productionLogger';

interface UseAutomaticJobCleanupProps {
  jobs: BatchJob[];
}

export const useAutomaticJobCleanup = ({ jobs }: UseAutomaticJobCleanupProps) => {
  const { removeJob, updateJob } = useBatchJobStore();
  const cleanupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastCleanupRef = useRef<number>(0);

  const performCleanup = useCallback(() => {
    const now = Date.now();
    const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
    
    // Don't run cleanup too frequently
    if (now - lastCleanupRef.current < CLEANUP_INTERVAL) {
      return;
    }
    
    lastCleanupRef.current = now;
    
    let removedCount = 0;
    let stalledCount = 0;
    
    jobs.forEach(job => {
      const jobAge = now - new Date(job.created_at * 1000).getTime();
      const isAncient = jobAge > 48 * 60 * 60 * 1000; // 48+ hours
      const isVeryOld = jobAge > 24 * 60 * 60 * 1000; // 24+ hours
      
      // Remove ancient completed jobs
      if (isAncient && ['completed', 'failed', 'cancelled', 'expired'].includes(job.status)) {
        productionLogger.info(`Auto-cleanup: Removing ancient ${job.status} job ${job.id.substring(0, 8)} (age: ${Math.round(jobAge/3600000)}h)`, undefined, 'AUTO_CLEANUP');
        removeJob(job.id);
        removedCount++;
        return;
      }
      
      // Auto-expire very old active jobs that are clearly stuck
      if (isVeryOld && ['validating', 'in_progress', 'finalizing'].includes(job.status)) {
        // Check if job has made any progress
        const hasProgress = job.request_counts.completed > 0;
        const progressRatio = job.request_counts.completed / job.request_counts.total;
        
        // If no progress after 24h, or minimal progress after 48h, mark as expired
        const shouldExpire = (!hasProgress && jobAge > 24 * 60 * 60 * 1000) || 
                           (hasProgress && progressRatio < 0.01 && jobAge > 48 * 60 * 60 * 1000);
        
        if (shouldExpire) {
          productionLogger.warn(`Auto-cleanup: Expiring stalled job ${job.id.substring(0, 8)} (age: ${Math.round(jobAge/3600000)}h, progress: ${job.request_counts.completed}/${job.request_counts.total})`, undefined, 'AUTO_CLEANUP');
          
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
    
    if (removedCount > 0 || stalledCount > 0) {
      productionLogger.info(`Auto-cleanup completed: ${removedCount} ancient jobs removed, ${stalledCount} stalled jobs expired`, {
        totalJobs: jobs.length,
        removedCount,
        stalledCount
      }, 'AUTO_CLEANUP');
    }
    
    // Force garbage collection if too many jobs
    if (jobs.length > 50 && typeof window !== 'undefined' && (window as any).gc) {
      try {
        (window as any).gc();
        productionLogger.debug('Auto-cleanup: Forced garbage collection', undefined, 'AUTO_CLEANUP');
      } catch (e) {
        // Ignore GC errors
      }
    }
  }, [jobs, removeJob, updateJob]);

  // Run cleanup periodically
  useEffect(() => {
    // Initial cleanup after 30 seconds
    const initialTimeout = setTimeout(() => {
      performCleanup();
    }, 30000);

    // Regular cleanup every 10 minutes
    cleanupTimerRef.current = setInterval(() => {
      performCleanup();
    }, 10 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current);
      }
    };
  }, [performCleanup]);

  // Cleanup when jobs change significantly
  useEffect(() => {
    const ancientJobs = jobs.filter(job => {
      const jobAge = Date.now() - new Date(job.created_at * 1000).getTime();
      return jobAge > 48 * 60 * 60 * 1000;
    });

    // If we have many ancient jobs, run cleanup immediately
    if (ancientJobs.length > 10) {
      productionLogger.warn(`Auto-cleanup: Detected ${ancientJobs.length} ancient jobs, running immediate cleanup`, undefined, 'AUTO_CLEANUP');
      performCleanup();
    }
  }, [jobs.length, performCleanup]);

  return {
    performCleanup
  };
};