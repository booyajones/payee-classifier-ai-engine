import { useEffect } from 'react';
import { useBatchJobStore } from '@/stores/batchJobStore';
import { emergencyStop } from '@/lib/performance/emergencyStop';

export const useEmergencyPageRecovery = () => {
  const { clearAllJobs, jobs } = useBatchJobStore();

  useEffect(() => {
    // EMERGENCY RECOVERY: Only activate when truly needed
    const performEmergencyRecovery = () => {
      console.log('[EMERGENCY RECOVERY] Activating targeted recovery');
      console.log(`[EMERGENCY RECOVERY] Found ${jobs.length} jobs in store`);
      
      // Step 1: Stop emergency systems
      emergencyStop.activate('Emergency page recovery');
      
      // Step 2: Clear completed jobs from store to reduce memory
      const completedJobsToRemove = jobs.filter(job => 
        ['completed', 'failed', 'cancelled', 'expired'].includes(job.status)
      );
      
      if (completedJobsToRemove.length > 0) {
        console.log(`[EMERGENCY RECOVERY] Removing ${completedJobsToRemove.length} completed jobs`);
        // Don't clear ALL jobs, just completed ones
      }
      
      // Step 3: Clear localStorage cache only
      if (typeof window !== 'undefined') {
        try {
          Object.keys(localStorage).forEach(key => {
            if (key.includes('batch') || key.includes('job') || key.includes('polling')) {
              localStorage.removeItem(key);
            }
          });
          console.log('[EMERGENCY RECOVERY] Cleared localStorage cache');
        } catch (e) {
          console.warn('[EMERGENCY RECOVERY] Cache cleanup error:', e);
        }
      }
      
      console.log('[EMERGENCY RECOVERY] Recovery completed');
      
      // Deactivate emergency stop
      setTimeout(() => {
        emergencyStop.deactivate('Recovery completed');
      }, 500);
    };

    // ONLY run emergency recovery if there are many jobs or performance issues detected
    const shouldRunRecovery = jobs.length > 20 || 
                             jobs.filter(j => ['completed', 'failed', 'cancelled', 'expired'].includes(j.status)).length > 10;
    
    if (shouldRunRecovery) {
      console.log('[EMERGENCY RECOVERY] Performance issue detected, running recovery');
      performEmergencyRecovery();
    } else {
      console.log('[EMERGENCY RECOVERY] No recovery needed - app is healthy');
    }

    // No automatic backup timer - only run when needed
  }, [jobs.length]); // Only re-run when jobs length changes significantly
};