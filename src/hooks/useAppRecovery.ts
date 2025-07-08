import { useEffect, useCallback } from 'react';
import { emergencyStop } from '@/lib/performance/emergencyStop';
import { debouncedStoreUpdater } from '@/lib/performance/debounceStore';
import { memoryManager } from '@/lib/performance/memoryManager';

/**
 * PHASE 4: Enhanced error recovery hook
 * Provides user-friendly recovery options and automatic retry mechanisms
 */
export const useAppRecovery = () => {
  // PHASE 4: Enhanced error recovery
  const performEmergencyRecovery = useCallback(async () => {
    console.log('[APP RECOVERY] Starting emergency recovery sequence');
    
    try {
      // Step 1: Activate emergency stop
      emergencyStop.activate('Emergency recovery initiated');
      
      // Step 2: Clear all pending operations
      debouncedStoreUpdater.destroy();
      
      // Step 3: Force memory cleanup
      await memoryManager.forceCleanup();
      
      // Step 4: Clear storage caches
      if (typeof window !== 'undefined') {
        try {
          Object.keys(localStorage).forEach(key => {
            if (key.includes('batch') || key.includes('job') || key.includes('polling')) {
              localStorage.removeItem(key);
            }
          });
          Object.keys(sessionStorage).forEach(key => {
            if (key.includes('batch') || key.includes('job') || key.includes('polling')) {
              sessionStorage.removeItem(key);
            }
          });
        } catch (e) {
          console.warn('[APP RECOVERY] Storage cleanup warning:', e);
        }
      }
      
      // Step 5: Force garbage collection if available
      if (typeof window !== 'undefined' && 'gc' in window) {
        (window as any).gc();
      }
      
      console.log('[APP RECOVERY] Emergency recovery completed');
      
      // Step 6: Deactivate emergency stop after cleanup
      setTimeout(() => {
        emergencyStop.deactivate('Recovery completed');
      }, 1000);
      
      return true;
    } catch (error) {
      console.error('[APP RECOVERY] Recovery failed:', error);
      return false;
    }
  }, []);

  // PHASE 4: Automatic recovery trigger for critical errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const error = event.error;
      
      // Trigger recovery for specific critical errors
      if (error && (
        error.message?.includes('Maximum update depth exceeded') ||
        error.message?.includes('Too many re-renders') ||
        error.message?.includes('Cannot read properties of undefined') ||
        error.name === 'ChunkLoadError'
      )) {
        console.warn('[APP RECOVERY] Critical error detected, triggering recovery:', error.message);
        performEmergencyRecovery();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('Network request failed') ||
          event.reason?.message?.includes('fetch')) {
        console.warn('[APP RECOVERY] Network error detected, triggering recovery');
        performEmergencyRecovery();
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [performEmergencyRecovery]);

  // PHASE 4: Manual recovery function for user-initiated recovery
  const manualRecovery = useCallback(() => {
    console.log('[APP RECOVERY] Manual recovery requested by user');
    return performEmergencyRecovery();
  }, [performEmergencyRecovery]);

  return {
    performEmergencyRecovery,
    manualRecovery
  };
};