import { performanceLogger } from '@/lib/logging';

/**
 * Performance tracking utilities for classification operations
 */
export class PerformanceTracker {
  private static timers: Map<string, number> = new Map();

  /**
   * Start timing a classification operation
   */
  static startClassification(payeeName: string): string {
    const id = `classification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.timers.set(id, performance.now());
    
    performanceLogger.startTiming(id, 'CLASSIFICATION');
    return id;
  }

  /**
   * End timing and emit performance event
   */
  static endClassification(
    id: string, 
    payeeName: string, 
    success: boolean, 
    classification?: string
  ): number {
    const startTime = this.timers.get(id);
    if (!startTime) return 0;

    const duration = performanceLogger.endTiming(id);
    this.timers.delete(id);

    // Emit custom event for performance dashboard
    const event = new CustomEvent('classificationComplete', {
      detail: {
        payeeName,
        duration,
        success,
        classification,
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(event);
    
    return duration;
  }

  /**
   * Track batch operation performance
   */
  static trackBatchOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    return performanceLogger.measureAsync(
      operationName,
      operation,
      'BATCH_OPERATION'
    );
  }

  /**
   * Track memory usage at specific points
   */
  static trackMemoryUsage(context: string) {
    performanceLogger.logMemoryUsage(context);
  }

  /**
   * Get performance summary
   */
  static getPerformanceSummary() {
    return {
      activeTimers: this.timers.size,
      memoryUsage: (performance as any).memory ? {
        used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024)
      } : null
    };
  }
}

export default PerformanceTracker;