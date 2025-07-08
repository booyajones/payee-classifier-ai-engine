import { useEffect } from 'react';
import { useBatchJobStore } from '@/stores/batchJobStore';
import { emergencyStop } from '@/lib/performance/emergencyStop';

export const useEmergencyPageRecovery = () => {
  const { clearAllJobs, jobs } = useBatchJobStore();

  useEffect(() => {
    // NUCLEAR OPTION: Immediate recovery on page load if unresponsive
    const performEmergencyRecovery = () => {
      console.log('[EMERGENCY RECOVERY] Page unresponsive - activating nuclear recovery');
      console.log(`[EMERGENCY RECOVERY] Found ${jobs.length} jobs in store`);
      
      // Step 1: Stop everything immediately
      emergencyStop.activate('Nuclear page recovery');
      
      // Step 2: Clear all jobs immediately
      clearAllJobs();
      
      // Step 3: NUCLEAR TIMER CLEANUP - clear ALL possible timers
      try {
        // Clear all timeout IDs (more aggressive range)
        for (let i = 1; i <= 999999; i++) {
          clearTimeout(i);
          clearInterval(i);
        }
        console.log('[EMERGENCY RECOVERY] Cleared all timers up to 999999');
      } catch (e) {
        console.warn('[EMERGENCY RECOVERY] Timer cleanup error:', e);
      }
      
      // Step 4: Clear requestAnimationFrame IDs
      try {
        for (let i = 1; i <= 9999; i++) {
          cancelAnimationFrame(i);
        }
        console.log('[EMERGENCY RECOVERY] Cleared all animation frames');
      } catch (e) {
        console.warn('[EMERGENCY RECOVERY] Animation frame cleanup error:', e);
      }
      
      // Clear any React Query cache
      if (typeof window !== 'undefined') {
        // Clear localStorage cache
        try {
          Object.keys(localStorage).forEach(key => {
            if (key.includes('batch') || key.includes('job') || key.includes('polling')) {
              localStorage.removeItem(key);
            }
          });
        } catch (e) {
          // Ignore errors
        }
        
        // Force garbage collection
        if ((window as any).gc) {
          try {
            (window as any).gc();
          } catch (e) {
            // Ignore errors
          }
        }
      }
      
      console.log('[EMERGENCY RECOVERY] Nuclear recovery completed');
      
      // Deactivate emergency stop after cleanup
      setTimeout(() => {
        emergencyStop.deactivate('Nuclear recovery completed');
      }, 1000);
    };

    // Run immediately on mount
    performEmergencyRecovery();
    
    // Also run after a short delay as backup
    const backupTimer = setTimeout(() => {
      performEmergencyRecovery();
    }, 500);

    return () => {
      clearTimeout(backupTimer);
    };
  }, []); // Empty dependency array - only run once on mount
};