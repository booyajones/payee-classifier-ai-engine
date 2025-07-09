import React, { useRef, useEffect, useCallback } from 'react';

interface RenderMetrics {
  renderCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
  slowRenders: number;
}

/**
 * RENDER OPTIMIZATION HOOK
 * Tracks and optimizes component render performance
 */
export const useRenderOptimization = (componentName: string = 'Unknown') => {
  const renderCountRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);
  const lastRenderStartRef = useRef<number>(0);
  const slowRenderThreshold = 16; // 16ms = 60fps

  // Track render start
  const trackRenderStart = useCallback(() => {
    lastRenderStartRef.current = performance.now();
  }, []);

  // Track render end
  const trackRenderEnd = useCallback(() => {
    const renderTime = performance.now() - lastRenderStartRef.current;
    renderCountRef.current += 1;
    renderTimesRef.current.push(renderTime);

    // Keep only last 10 render times
    if (renderTimesRef.current.length > 10) {
      renderTimesRef.current.shift();
    }

    // Log slow renders
    if (renderTime > slowRenderThreshold) {
      console.warn(`[RENDER OPTIMIZATION] Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
    }
  }, [componentName, slowRenderThreshold]);

  // Calculate metrics
  const getMetrics = useCallback((): RenderMetrics => {
    const renderTimes = renderTimesRef.current;
    const averageRenderTime = renderTimes.length > 0 
      ? renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length 
      : 0;
    
    const slowRenders = renderTimes.filter(time => time > slowRenderThreshold).length;

    return {
      renderCount: renderCountRef.current,
      averageRenderTime,
      lastRenderTime: renderTimes[renderTimes.length - 1] || 0,
      slowRenders
    };
  }, [slowRenderThreshold]);

  // Auto-track renders
  useEffect(() => {
    trackRenderStart();
    return trackRenderEnd;
  });

  return {
    trackRenderStart,
    trackRenderEnd,
    getMetrics
  };
};

/**
 * COMPONENT RENDER TRACKER
 * Higher-order component for automatic render tracking
 */
export const withRenderTracking = <P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) => {
  const TrackedComponent = (props: P) => {
    const { trackRenderStart, trackRenderEnd, getMetrics } = useRenderOptimization(
      componentName || Component.displayName || Component.name
    );

    // Log metrics periodically (only in development)
    useEffect(() => {
      if (process.env.NODE_ENV === 'development') {
        const interval = setInterval(() => {
          const metrics = getMetrics();
          if (metrics.renderCount > 0) {
            console.log(`[RENDER METRICS] ${componentName}:`, metrics);
          }
        }, 30000); // Every 30 seconds

        return () => clearInterval(interval);
      }
    }, [getMetrics, componentName]);

    trackRenderStart();

    return React.createElement(Component, props);
  };

  TrackedComponent.displayName = `TrackedRender(${Component.displayName || Component.name})`;
  return TrackedComponent;
};
