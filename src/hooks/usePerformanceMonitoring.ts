
import { useState, useEffect, useCallback, useRef } from 'react';
import React from 'react';
import { MemoryOptimizer } from '@/lib/performance/memoryOptimization';

interface PerformanceMetrics {
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryStart: number;
  memoryEnd?: number;
  memoryDelta?: number;
  status: 'running' | 'completed' | 'error';
  error?: string;
}

interface PerformanceStats {
  currentOperations: PerformanceMetrics[];
  completedOperations: PerformanceMetrics[];
  averageDuration: number;
  totalMemoryUsage: number;
  performanceScore: 'excellent' | 'good' | 'fair' | 'poor';
}

export const usePerformanceMonitoring = (enabled: boolean = false) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const operationRefs = useRef<Map<string, PerformanceMetrics>>(new Map());

  const startOperation = useCallback((operationName: string): string => {
    if (!enabled) return operationName;

    const operationId = `${operationName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const memoryStats = MemoryOptimizer.getMemoryStats();
    
    const metric: PerformanceMetrics = {
      operationName,
      startTime: performance.now(),
      memoryStart: memoryStats.usedJSHeapSize,
      status: 'running'
    };
    
    operationRefs.current.set(operationId, metric);
    setMetrics(prev => [...prev, metric]);
    
    console.log(`[PERFORMANCE] Started: ${operationName} (ID: ${operationId})`);
    return operationId;
  }, [enabled]);

  const finishOperation = useCallback((operationId: string, error?: string) => {
    if (!enabled) return;

    const metric = operationRefs.current.get(operationId);
    if (!metric) return;

    const endTime = performance.now();
    const memoryStats = MemoryOptimizer.getMemoryStats();
    
    const updatedMetric: PerformanceMetrics = {
      ...metric,
      endTime,
      duration: endTime - metric.startTime,
      memoryEnd: memoryStats.usedJSHeapSize,
      memoryDelta: memoryStats.usedJSHeapSize - metric.memoryStart,
      status: error ? 'error' : 'completed',
      error
    };
    
    operationRefs.current.set(operationId, updatedMetric);
    setMetrics(prev => prev.map(m => 
      m.operationName === metric.operationName && m.startTime === metric.startTime 
        ? updatedMetric 
        : m
    ));
    
    console.log(`[PERFORMANCE] Finished: ${metric.operationName}`, {
      duration: `${updatedMetric.duration?.toFixed(2)}ms`,
      memoryDelta: `${((updatedMetric.memoryDelta || 0) / 1024 / 1024).toFixed(2)}MB`,
      status: updatedMetric.status
    });
  }, [enabled]);

  const getPerformanceStats = useCallback((): PerformanceStats => {
    const completed = metrics.filter(m => m.status === 'completed');
    const running = metrics.filter(m => m.status === 'running');
    
    const totalDuration = completed.reduce((sum, m) => sum + (m.duration || 0), 0);
    const averageDuration = completed.length > 0 ? totalDuration / completed.length : 0;
    
    const totalMemoryUsage = completed.reduce((sum, m) => sum + Math.abs(m.memoryDelta || 0), 0);
    
    // Calculate performance score based on duration and memory usage
    let performanceScore: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
    if (averageDuration > 5000) performanceScore = 'poor';
    else if (averageDuration > 2000) performanceScore = 'fair';
    else if (averageDuration > 1000) performanceScore = 'good';
    
    return {
      currentOperations: running,
      completedOperations: completed,
      averageDuration,
      totalMemoryUsage,
      performanceScore
    };
  }, [metrics]);

  const clearMetrics = useCallback(() => {
    setMetrics([]);
    operationRefs.current.clear();
  }, []);

  const exportMetrics = useCallback(() => {
    const stats = getPerformanceStats();
    const exportData = {
      timestamp: new Date().toISOString(),
      stats,
      detailedMetrics: metrics
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [metrics, getPerformanceStats]);

  // Auto-cleanup old metrics
  useEffect(() => {
    if (!enabled) return;

    const cleanup = setInterval(() => {
      const cutoff = performance.now() - (30 * 60 * 1000); // 30 minutes ago
      setMetrics(prev => prev.filter(m => m.startTime > cutoff));
      
      // Clean up refs
      for (const [id, metric] of operationRefs.current.entries()) {
        if (metric.startTime < cutoff) {
          operationRefs.current.delete(id);
        }
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(cleanup);
  }, [enabled]);

  return {
    startOperation,
    finishOperation,
    getPerformanceStats,
    clearMetrics,
    exportMetrics,
    isMonitoring,
    setIsMonitoring,
    metrics: enabled ? metrics : []
  };
};

// Higher-order component for automatic performance tracking
export const withPerformanceTracking = (
  Component: React.ComponentType<any>,
  operationName: string
) => {
  const WrappedComponent = (props: any) => {
    const { startOperation, finishOperation } = usePerformanceMonitoring(true);
    const operationIdRef = useRef<string>();

    useEffect(() => {
      operationIdRef.current = startOperation(`${operationName}-render`);
      
      return () => {
        if (operationIdRef.current) {
          finishOperation(operationIdRef.current);
        }
      };
    }, [startOperation, finishOperation]);

    return React.createElement(Component, props);
  };

  WrappedComponent.displayName = `withPerformanceTracking(${Component.displayName || Component.name})`;
  
  return React.memo(WrappedComponent);
};
