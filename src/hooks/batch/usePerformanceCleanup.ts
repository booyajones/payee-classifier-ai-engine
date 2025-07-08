import { useEffect, useRef } from 'react';
import { useBatchJobStore } from '@/stores/batchJobStore';
import { emergencyStop } from '@/lib/performance/emergencyStop';

/**
 * Performance cleanup hook that automatically manages memory and cleanup
 */
export const usePerformanceCleanup = () => {
  const { jobs, removeJob } = useBatchJobStore();
  const cleanupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastCleanupRef = useRef<number>(0);

  useEffect(() => {
    const performCleanup = () => {
      const now = Date.now();
      
      // Only run cleanup every 5 minutes to prevent excessive operations
      if (now - lastCleanupRef.current < 5 * 60 * 1000) {
        return;
      }
      
      lastCleanupRef.current = now;
      
      console.log('[PERFORMANCE CLEANUP] Starting automatic cleanup');
      
      // Remove very old completed jobs from memory (older than 24 hours)
      const oldJobs = jobs.filter(job => {
        if (!['completed', 'failed', 'cancelled', 'expired'].includes(job.status)) {
          return false;
        }
        
        const jobAge = now - new Date(job.created_at * 1000).getTime();
        return jobAge > 24 * 60 * 60 * 1000; // 24 hours
      });
      
      if (oldJobs.length > 0) {
        console.log(`[PERFORMANCE CLEANUP] Removing ${oldJobs.length} old completed jobs from memory`);
        oldJobs.forEach(job => removeJob(job.id));
      }
      
      // Clear localStorage cache if it's getting too large
      if (typeof window !== 'undefined') {
        try {
          const storageSize = JSON.stringify(localStorage).length;
          if (storageSize > 5 * 1024 * 1024) { // 5MB threshold
            console.log('[PERFORMANCE CLEANUP] Clearing large localStorage cache');
            Object.keys(localStorage).forEach(key => {
              if (key.includes('batch') || key.includes('job') || key.includes('polling')) {
                localStorage.removeItem(key);
              }
            });
          }
        } catch (e) {
          console.warn('[PERFORMANCE CLEANUP] Storage cleanup error:', e);
        }
      }
      
      // Memory usage check and emergency stop if needed
      if (jobs.length > 100) {
        console.warn('[PERFORMANCE CLEANUP] Excessive jobs detected, activating emergency mode');
        emergencyStop.activate('Too many jobs in memory');
      }
    };

    // Run cleanup every 10 minutes
    cleanupTimerRef.current = setInterval(performCleanup, 10 * 60 * 1000);
    
    // Run initial cleanup after 30 seconds
    const initialCleanupTimer = setTimeout(performCleanup, 30 * 1000);

    return () => {
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current);
      }
      clearTimeout(initialCleanupTimer);
    };
  }, []); // No dependencies to prevent re-creation

  // Manual cleanup function
  const forceCleanup = () => {
    const completedJobs = jobs.filter(job => 
      ['completed', 'failed', 'cancelled', 'expired'].includes(job.status)
    );
    
    console.log(`[PERFORMANCE CLEANUP] Force removing ${completedJobs.length} completed jobs`);
    completedJobs.forEach(job => removeJob(job.id));
  };

  return { forceCleanup };
};