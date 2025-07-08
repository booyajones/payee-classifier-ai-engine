import { useEffect, useState } from 'react';
import { productionLogger } from '@/lib/logging/productionLogger';

interface PerformanceCircuitBreakerProps {
  children: React.ReactNode;
}

export const PerformanceCircuitBreaker = ({ children }: PerformanceCircuitBreakerProps) => {
  const [isCircuitOpen, setIsCircuitOpen] = useState(false);
  const [renderCount, setRenderCount] = useState(0);
  const [lastRenderTime, setLastRenderTime] = useState(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime;
    
    setRenderCount(prev => prev + 1);
    setLastRenderTime(now);

    // CIRCUIT BREAKER: If we're re-rendering too frequently, open the circuit
    if (timeSinceLastRender < 100 && renderCount > 10) { // More than 10 renders in 100ms
      productionLogger.error('[PERFORMANCE CIRCUIT BREAKER] Too many rapid re-renders detected', {
        renderCount,
        timeSinceLastRender
      }, 'PERFORMANCE');
      
      setIsCircuitOpen(true);
      
      // Reset circuit after 5 seconds
      setTimeout(() => {
        setIsCircuitOpen(false);
        setRenderCount(0);
      }, 5000);
    }

    // Reset render count every 5 seconds
    const resetTimer = setTimeout(() => {
      setRenderCount(0);
    }, 5000);

    return () => clearTimeout(resetTimer);
  }, [renderCount, lastRenderTime]);

  if (isCircuitOpen) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800">Performance Protection Active</h3>
        <p className="text-sm text-yellow-700 mt-1">
          The page was re-rendering too frequently and has been temporarily paused to prevent unresponsiveness.
          This will automatically resume in a few seconds.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};