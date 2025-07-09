import { useCallback } from 'react';
import { useStablePerformanceMonitor } from './useStablePerformanceMonitor';

/**
 * GENTLE PERFORMANCE STABILIZER
 * Replaces the aggressive emergency system with gentle monitoring
 */
export const usePerformanceStabilizer = () => {
  const { getMetrics, clearWarnings, isStable } = useStablePerformanceMonitor();

  // Gentle cleanup that doesn't cause more problems
  const emergencyCleanup = useCallback(() => {
    console.log('[PERFORMANCE STABILIZER] Executing gentle cleanup');
    
    // Clear performance-related localStorage only
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove = Object.keys(localStorage).filter(key => 
          key.includes('polling-state') || 
          key.includes('performance-cache') ||
          key.includes('temp-')
        );
        
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });
        
        console.log(`[PERFORMANCE STABILIZER] Cleared ${keysToRemove.length} cache entries`);
      } catch (e) {
        console.warn('[PERFORMANCE STABILIZER] localStorage cleanup failed:', e);
      }
    }
    
    // Clear performance warnings
    clearWarnings();
    
    console.log('[PERFORMANCE STABILIZER] Gentle cleanup completed');
  }, [clearWarnings]);

  const metrics = getMetrics();

  return {
    emergencyCleanup,
    isStable,
    metrics
  };
};