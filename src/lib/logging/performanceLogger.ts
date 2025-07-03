import { logger } from './logger';

interface PerformanceMetric {
  name: string;
  startTime: number;
  context?: string;
}

class PerformanceLogger {
  private metrics: Map<string, PerformanceMetric> = new Map();

  startTiming(name: string, context?: string): void {
    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      context
    });
    
    logger.debug(`Performance timing started: ${name}`, null, context);
  }

  endTiming(name: string): number {
    const metric = this.metrics.get(name);
    
    if (!metric) {
      logger.warn(`Performance timing not found: ${name}`);
      return 0;
    }

    const duration = performance.now() - metric.startTime;
    this.metrics.delete(name);
    
    logger.info(
      `Performance timing completed: ${name} took ${duration.toFixed(2)}ms`,
      { duration, name },
      metric.context
    );

    return duration;
  }

  measureAsync<T>(name: string, fn: () => Promise<T>, context?: string): Promise<T> {
    this.startTiming(name, context);
    
    return fn()
      .then(result => {
        this.endTiming(name);
        return result;
      })
      .catch(error => {
        this.endTiming(name);
        throw error;
      });
  }

  measureSync<T>(name: string, fn: () => T, context?: string): T {
    this.startTiming(name, context);
    
    try {
      const result = fn();
      this.endTiming(name);
      return result;
    } catch (error) {
      this.endTiming(name);
      throw error;
    }
  }

  logMemoryUsage(context?: string): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = (memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
      const totalMB = (memory.totalJSHeapSize / 1024 / 1024).toFixed(2);
      const limitMB = (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2);
      
      logger.info(
        `Memory usage: ${usedMB}MB / ${totalMB}MB (limit: ${limitMB}MB)`,
        { usedMB, totalMB, limitMB },
        context
      );
    }
  }
}

export const performanceLogger = new PerformanceLogger();
