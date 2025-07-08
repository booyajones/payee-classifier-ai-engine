import { useEffect, useRef, useCallback } from 'react';
import { emergencyStop } from '@/lib/performance/emergencyStop';
import { debouncedStoreUpdater } from '@/lib/performance/debounceStore';

/**
 * EMERGENCY PERFORMANCE STABILIZER
 * Implements aggressive performance monitoring and recovery mechanisms
 */
export const usePerformanceStabilizer = () => {
  const renderCountRef = useRef(0);
  const lastPerformanceCheck = useRef(Date.now());
  const memoryWarnings = useRef(0);

  // AGGRESSIVE RENDER MONITORING
  useEffect(() => {
    renderCountRef.current += 1;
    
    // EMERGENCY: Very low threshold for render loop detection
    if (renderCountRef.current > 5) {
      console.error('[PERFORMANCE STABILIZER] Critical render loop detected');
      emergencyStop.activate('Critical render loop in performance stabilizer');
      return;
    }
    
    // Reset every 500ms for fast response
    const resetTimer = setTimeout(() => {
      renderCountRef.current = 0;
    }, 500);
    
    return () => clearTimeout(resetTimer);
  }, []);

  // MEMORY MONITORING
  const checkMemoryUsage = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    try {
      // Check memory if available
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        
        if (memoryUsage > 0.85) { // Over 85% memory usage
          memoryWarnings.current += 1;
          console.warn('[PERFORMANCE STABILIZER] High memory usage detected:', memoryUsage);
          
          if (memoryWarnings.current > 3) {
            console.error('[PERFORMANCE STABILIZER] Critical memory usage - activating emergency stop');
            emergencyStop.activate('Critical memory usage');
            
            // Force garbage collection if available
            if ('gc' in window) {
              (window as any).gc();
            }
          }
        } else if (memoryUsage < 0.5) {
          // Reset warnings if memory usage drops
          memoryWarnings.current = 0;
        }
      }
    } catch (error) {
      console.warn('[PERFORMANCE STABILIZER] Memory check failed:', error);
    }
  }, []);

  // PERFORMANCE MONITORING LOOP - REDUCED FREQUENCY
  useEffect(() => {
    const monitorPerformance = () => {
      const now = Date.now();
      
      // Check every 5 seconds (reduced from 2s)
      if (now - lastPerformanceCheck.current > 5000) {
        lastPerformanceCheck.current = now;
        checkMemoryUsage();
        
        // Force flush any pending store updates to prevent accumulation
        debouncedStoreUpdater.forceFlush(() => {});
      }
    };

    // Start monitoring only after 5 seconds to let app stabilize
    const startTimer = setTimeout(() => {
      const intervalId = setInterval(monitorPerformance, 5000); // Reduced from 1s to 5s
      
      // Store interval for cleanup
      return () => clearInterval(intervalId);
    }, 5000);

    return () => clearTimeout(startTimer);
  }, [checkMemoryUsage]);

  // EMERGENCY CLEANUP
  const emergencyCleanup = useCallback(() => {
    console.log('[PERFORMANCE STABILIZER] Executing emergency cleanup');
    
    // Clear all localStorage caches
    if (typeof window !== 'undefined') {
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.includes('batch') || key.includes('job') || key.includes('polling') || key.includes('cache')) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn('[PERFORMANCE STABILIZER] localStorage cleanup failed:', e);
      }
    }
    
    // Reset memory warnings
    memoryWarnings.current = 0;
    renderCountRef.current = 0;
    
    console.log('[PERFORMANCE STABILIZER] Emergency cleanup completed');
  }, []);

  return {
    emergencyCleanup,
    isStable: renderCountRef.current < 3 && memoryWarnings.current < 2
  };
};