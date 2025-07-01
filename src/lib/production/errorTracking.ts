import { productionLogger } from '@/lib/logging';
import { useProductionStore } from '@/stores/productionStore';
import { ENV_CONFIG } from '@/lib/config/environmentConfig';

/**
 * Production error tracking and reporting system
 */

export interface ErrorReport {
  id: string;
  timestamp: number;
  level: 'error' | 'warn' | 'critical';
  message: string;
  context?: string;
  stack?: string;
  userAgent: string;
  url: string;
  userId?: string;
  metadata?: Record<string, any>;
}

class ProductionErrorTracker {
  private static instance: ProductionErrorTracker;
  private errorQueue: ErrorReport[] = [];
  private maxQueueSize = 100;

  static getInstance(): ProductionErrorTracker {
    if (!ProductionErrorTracker.instance) {
      ProductionErrorTracker.instance = new ProductionErrorTracker();
    }
    return ProductionErrorTracker.instance;
  }

  /**
   * Track an error with comprehensive context
   */
  trackError(
    error: Error | string,
    context?: string,
    level: 'error' | 'warn' | 'critical' = 'error',
    metadata?: Record<string, any>
  ): string {
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const errorReport: ErrorReport = {
      id: errorId,
      timestamp: Date.now(),
      level,
      message: typeof error === 'string' ? error : error.message,
      context,
      stack: typeof error === 'object' ? error.stack : undefined,
      userAgent: navigator.userAgent,
      url: window.location.href,
      metadata: {
        ...metadata,
        memoryUsage: this.getMemoryInfo(),
        timestamp: new Date().toISOString()
      }
    };

    // Add to queue
    this.errorQueue.push(errorReport);
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    // Update production store
    useProductionStore.getState().setErrorState(errorReport.message);

    // Log based on level
    switch (level) {
      case 'critical':
        productionLogger.error(`CRITICAL: ${errorReport.message}`, errorReport.metadata, context);
        break;
      case 'error':
        productionLogger.error(errorReport.message, errorReport.metadata, context);
        break;
      case 'warn':
        productionLogger.warn(errorReport.message, errorReport.metadata, context);
        break;
    }

    // In production, could send to external error tracking service
    if (ENV_CONFIG.isProduction && level === 'critical') {
      this.sendToExternalService(errorReport);
    }

    return errorId;
  }

  /**
   * Track performance issues
   */
  trackPerformanceIssue(
    operation: string,
    duration: number,
    threshold: number = 5000,
    context?: string
  ): void {
    if (duration > threshold) {
      this.trackError(
        `Performance issue: ${operation} took ${duration.toFixed(2)}ms`,
        context || 'PERFORMANCE',
        'warn',
        {
          operation,
          duration,
          threshold,
          performanceIssue: true
        }
      );
    }
  }

  /**
   * Track classification errors with specific context
   */
  trackClassificationError(
    payeeName: string,
    error: Error | string,
    method: string,
    metadata?: Record<string, any>
  ): string {
    return this.trackError(
      `Classification failed for "${payeeName}": ${typeof error === 'string' ? error : error.message}`,
      'CLASSIFICATION',
      'error',
      {
        payeeName,
        method,
        classificationError: true,
        ...metadata
      }
    );
  }

  /**
   * Track file processing errors
   */
  trackFileError(
    fileName: string,
    error: Error | string,
    stage: string,
    metadata?: Record<string, any>
  ): string {
    return this.trackError(
      `File processing failed for "${fileName}" at stage "${stage}": ${typeof error === 'string' ? error : error.message}`,
      'FILE_PROCESSING',
      'error',
      {
        fileName,
        stage,
        fileError: true,
        ...metadata
      }
    );
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const now = Date.now();
    const last24h = this.errorQueue.filter(e => now - e.timestamp < 24 * 60 * 60 * 1000);
    const lastHour = this.errorQueue.filter(e => now - e.timestamp < 60 * 60 * 1000);

    return {
      total: this.errorQueue.length,
      last24h: last24h.length,
      lastHour: lastHour.length,
      byLevel: {
        critical: this.errorQueue.filter(e => e.level === 'critical').length,
        error: this.errorQueue.filter(e => e.level === 'error').length,
        warn: this.errorQueue.filter(e => e.level === 'warn').length
      },
      byContext: this.getErrorsByContext()
    };
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 10): ErrorReport[] {
    return this.errorQueue
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.errorQueue = [];
    useProductionStore.getState().clearErrors();
    productionLogger.info('Error queue cleared', null, 'ERROR_TRACKER');
  }

  /**
   * Export errors for debugging
   */
  exportErrors(): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      environment: ENV_CONFIG.isProduction ? 'production' : 'development',
      stats: this.getErrorStats(),
      errors: this.errorQueue
    };

    return JSON.stringify(exportData, null, 2);
  }

  private getMemoryInfo() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
      };
    }
    return null;
  }

  private getErrorsByContext(): Record<string, number> {
    const contextCounts: Record<string, number> = {};
    this.errorQueue.forEach(error => {
      const context = error.context || 'UNKNOWN';
      contextCounts[context] = (contextCounts[context] || 0) + 1;
    });
    return contextCounts;
  }

  private async sendToExternalService(errorReport: ErrorReport): Promise<void> {
    // In a real application, this would send to Sentry, LogRocket, etc.
    try {
      // Placeholder for external error reporting
      productionLogger.info('Critical error reported to external service', {
        errorId: errorReport.id,
        level: errorReport.level
      }, 'ERROR_TRACKER');
    } catch (error) {
      productionLogger.error('Failed to send error to external service', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'ERROR_TRACKER');
    }
  }
}

// Global error tracking instance
export const errorTracker = ProductionErrorTracker.getInstance();

// Global error handler
window.addEventListener('error', (event) => {
  errorTracker.trackError(
    event.error || event.message,
    'GLOBAL_ERROR_HANDLER',
    'critical',
    {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    }
  );
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  errorTracker.trackError(
    event.reason,
    'UNHANDLED_PROMISE_REJECTION',
    'critical',
    {
      promise: 'Promise rejection not handled'
    }
  );
});

// React error boundary integration
export const withErrorTracking = (error: Error, errorInfo: any, context?: string) => {
  return errorTracker.trackError(
    error,
    context || 'REACT_ERROR_BOUNDARY',
    'error',
    {
      componentStack: errorInfo?.componentStack,
      reactError: true
    }
  );
};