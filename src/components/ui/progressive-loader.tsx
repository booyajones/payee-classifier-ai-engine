import React, { useState, useEffect, ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface ProgressiveLoaderProps {
  children: ReactNode;
  delay?: number;
  fallback?: ReactNode;
  skeleton?: ReactNode;
}

/**
 * PHASE 4: Progressive loader that delays rendering to prevent immediate overwhelm
 */
export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
  children,
  delay = 200,
  fallback,
  skeleton
}) => {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldRender(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  if (!shouldRender) {
    if (skeleton) {
      return <>{skeleton}</>;
    }
    
    if (fallback) {
      return <>{fallback}</>;
    }

    // Default skeleton
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return <>{children}</>;
};

interface StaggeredLoaderProps {
  children: ReactNode[];
  staggerDelay?: number;
}

/**
 * PHASE 4: Staggered loader for multiple components
 */
export const StaggeredLoader: React.FC<StaggeredLoaderProps> = ({
  children,
  staggerDelay = 100
}) => {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount < children.length) {
      const timer = setTimeout(() => {
        setVisibleCount(prev => prev + 1);
      }, staggerDelay);

      return () => clearTimeout(timer);
    }
  }, [visibleCount, children.length, staggerDelay]);

  return (
    <>
      {children.slice(0, visibleCount).map((child, index) => (
        <React.Fragment key={index}>{child}</React.Fragment>
      ))}
    </>
  );
};