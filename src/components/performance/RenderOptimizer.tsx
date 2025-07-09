import React, { memo, useMemo } from 'react';

interface RenderOptimizerProps {
  children: React.ReactNode;
  dependencies?: any[];
  skipMemo?: boolean;
}

/**
 * RENDER OPTIMIZER
 * Wrapper component that prevents unnecessary re-renders
 */
const RenderOptimizer = memo<RenderOptimizerProps>(({ 
  children, 
  dependencies = [], 
  skipMemo = false 
}) => {
  // Memoize children if dependencies provided
  const memoizedChildren = useMemo(() => {
    return children;
  }, dependencies);

  return skipMemo ? <>{children}</> : <>{memoizedChildren}</>;
});

RenderOptimizer.displayName = 'RenderOptimizer';

export { RenderOptimizer };

// Higher-order component for automatic optimization
export const withRenderOptimization = <P extends object>(
  Component: React.ComponentType<P>,
  compareFn?: (prevProps: P, nextProps: P) => boolean
) => {
  const OptimizedComponent = memo(Component, compareFn);
  OptimizedComponent.displayName = `Optimized(${Component.displayName || Component.name})`;
  return OptimizedComponent;
};

// Hook for memoizing expensive calculations
export const useOptimizedMemo = <T,>(factory: () => T, deps: React.DependencyList): T => {
  return useMemo(factory, deps);
};

// Hook for memoizing callbacks  
export const useOptimizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  return React.useCallback(callback, deps);
};