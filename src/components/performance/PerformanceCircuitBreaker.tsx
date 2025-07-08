import { useRef, useEffect, useState } from 'react';
import { productionLogger } from '@/lib/logging/productionLogger';

interface PerformanceCircuitBreakerProps {
  children: React.ReactNode;
}

export const PerformanceCircuitBreaker = ({ children }: PerformanceCircuitBreakerProps) => {
  const [isCircuitOpen, setIsCircuitOpen] = useState(false);
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const circuitTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTimeRef.current;
    
    renderCountRef.current += 1;
    lastRenderTimeRef.current = now;

    // EMERGENCY CIRCUIT BREAKER: Nuclear option for runaway renders
    if (renderCountRef.current > 50) {
      productionLogger.error('[EMERGENCY CIRCUIT BREAKER] Nuclear option activated - too many renders', {
        renderCount: renderCountRef.current
      }, 'PERFORMANCE');
      
      setIsCircuitOpen(true);
      
      // Emergency reset after 10 seconds
      if (circuitTimerRef.current) clearTimeout(circuitTimerRef.current);
      circuitTimerRef.current = setTimeout(() => {
        setIsCircuitOpen(false);
        renderCountRef.current = 0;
        productionLogger.info('[EMERGENCY CIRCUIT BREAKER] Emergency reset completed', undefined, 'PERFORMANCE');
      }, 10000);
      
      return;
    }

    // CIRCUIT BREAKER: If we're re-rendering too frequently, open the circuit
    if (timeSinceLastRender < 100 && renderCountRef.current > 15) {
      productionLogger.error('[PERFORMANCE CIRCUIT BREAKER] Too many rapid re-renders detected', {
        renderCount: renderCountRef.current,
        timeSinceLastRender
      }, 'PERFORMANCE');
      
      setIsCircuitOpen(true);
      
      // Reset circuit after 5 seconds
      if (circuitTimerRef.current) clearTimeout(circuitTimerRef.current);
      circuitTimerRef.current = setTimeout(() => {
        setIsCircuitOpen(false);
        renderCountRef.current = 0;
      }, 5000);
    }

    // Reset render count every 3 seconds (more aggressive)
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      renderCountRef.current = 0;
    }, 3000);

  }, []); // CRITICAL FIX: Empty dependency array to prevent infinite loop

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (circuitTimerRef.current) clearTimeout(circuitTimerRef.current);
    };
  }, []);

  if (isCircuitOpen) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800">Performance Protection Active</h3>
        <p className="text-sm text-yellow-700 mt-1">
          The page was re-rendering too frequently and has been temporarily paused to prevent unresponsiveness.
          This will automatically resume in a few seconds.
        </p>
        <button 
          onClick={() => {
            setIsCircuitOpen(false);
            renderCountRef.current = 0;
            productionLogger.info('[CIRCUIT BREAKER] Manual recovery triggered', undefined, 'PERFORMANCE');
          }}
          className="mt-2 px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
        >
          Force Resume
        </button>
      </div>
    );
  }

  return <>{children}</>;
};