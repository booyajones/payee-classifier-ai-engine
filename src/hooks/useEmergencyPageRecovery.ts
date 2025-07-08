import { useEffect } from 'react';
import { useBatchJobStore } from '@/stores/batchJobStore';
import { emergencyStop } from '@/lib/performance/emergencyStop';

export const useEmergencyPageRecovery = () => {
  const { clearAllJobs } = useBatchJobStore();

  useEffect(() => {
    // NUCLEAR OPTION: Immediate recovery on page load
    const performEmergencyRecovery = () => {
      console.log('[EMERGENCY RECOVERY] Page unresponsive - activating nuclear recovery');
      
      // Stop everything immediately
      emergencyStop.activate('Nuclear page recovery');
      
      // Clear all jobs immediately
      clearAllJobs();
      
      // Clear all timers and intervals aggressively
      try {
        const highestId = 99999;
        for (let i = 1; i <= highestId; i++) {
          clearTimeout(i);
          clearInterval(i);
        }
      } catch (e) {
        // Ignore errors
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