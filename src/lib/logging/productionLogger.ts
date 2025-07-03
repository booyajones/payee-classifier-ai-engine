// @ts-nocheck
import { logger, LogLevel } from './logger';

/**
 * Production-optimized logging configuration and utilities
 * Provides environment-aware logging with performance optimizations
 */

// Environment-based configuration
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// Production log level mapping
const PRODUCTION_LOG_LEVELS: Record<string, LogLevel> = {
  development: 'debug',
  production: 'warn', // Only warnings and errors in production
  test: 'error'
};

// Performance-aware logging with minimal overhead in production
class ProductionLogger {
  private static instance: ProductionLogger;
  private logLevel: LogLevel;
  private performanceMode: boolean;

  constructor() {
    this.logLevel = isDevelopment ? 'debug' : 'warn';
    this.performanceMode = isProduction;
    this.configureLogger();
  }

  static getInstance(): ProductionLogger {
    if (!ProductionLogger.instance) {
      ProductionLogger.instance = new ProductionLogger();
    }
    return ProductionLogger.instance;
  }

  private configureLogger() {
    logger.setLogLevel(this.logLevel);
  }

  /**
   * High-performance debug logging (no-op in production)
   */
  debug(message: string, data?: any, context?: string) {
    if (!isDevelopment) return; // Early return for production
    logger.debug(message, data, context);
  }

  /**
   * Info logging with performance optimization
   */
  info(message: string, data?: any, context?: string) {
    if (this.performanceMode && this.logLevel !== 'debug') {
      // Skip info logs in production unless explicitly configured
      return;
    }
    logger.info(message, data, context);
  }

  /**
   * Warning logging (always enabled)
   */
  warn(message: string, data?: any, context?: string) {
    logger.warn(message, data, context);
  }

  /**
   * Error logging (always enabled with enhanced context)
   */
  error(message: string, data?: any, context?: string) {
    // Enhanced error logging in production
    const enhancedData = isProduction ? {
      ...data,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    } : data;

    logger.error(message, enhancedData, context);
  }

  /**
   * Legacy console.log replacement for migration
   */
  log(message: string, ...data: any[]) {
    if (!isDevelopment) return; // No-op in production
    this.debug(message, data.length === 1 ? data[0] : data);
  }

  /**
   * Performance-aware batch logging
   */
  batch(entries: Array<{ level: LogLevel; message: string; data?: any; context?: string }>) {
    if (this.performanceMode && entries.length > 10) {
      // Batch and throttle in production
      const important = entries.filter(e => e.level === 'error' || e.level === 'warn');
      important.forEach(entry => {
        this[entry.level](entry.message, entry.data, entry.context);
      });
    } else {
      entries.forEach(entry => {
        this[entry.level](entry.message, entry.data, entry.context);
      });
    }
  }

  /**
   * Classification-specific logging with context
   */
  classification = {
    start: (payeeName: string, method: string) => {
      this.debug(`Classification started: ${payeeName}`, { method }, 'CLASSIFICATION');
    },
    
    success: (payeeName: string, result: string, confidence: number, duration: number) => {
      this.info(`Classification completed: ${payeeName} → ${result}`, { 
        confidence, 
        duration,
        performance: duration < 1000 ? 'good' : 'slow'
      }, 'CLASSIFICATION');
    },
    
    error: (payeeName: string, error: Error, method: string) => {
      this.error(`Classification failed: ${payeeName}`, { 
        error: error.message,
        method,
        stack: isDevelopment ? error.stack : undefined
      }, 'CLASSIFICATION');
    },
    
    batch: (count: number, duration: number, successRate: number) => {
      this.info(`Batch classification completed: ${count} items`, {
        duration,
        successRate,
        averageTime: duration / count
      }, 'BATCH_CLASSIFICATION');
    }
  };

  /**
   * Performance logging utilities
   */
  performance = {
    start: (operation: string, context?: string) => {
      if (!isDevelopment && !context?.includes('CRITICAL')) return;
      this.debug(`Performance: ${operation} started`, null, context);
    },
    
    end: (operation: string, duration: number, context?: string) => {
      if (duration > 5000 || isDevelopment) {
        this.info(`Performance: ${operation} completed in ${duration.toFixed(2)}ms`, {
          duration,
          slow: duration > 5000
        }, context);
      }
    },
    
    memory: (context?: string) => {
      if (!isDevelopment) return;
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.debug('Memory usage', {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
        }, context);
      }
    }
  };

  /**
   * Database operation logging
   */
  database = {
    query: (operation: string, table: string, duration?: number) => {
      this.debug(`Database: ${operation} on ${table}`, { duration }, 'DATABASE');
    },
    
    error: (operation: string, table: string, error: Error) => {
      this.error(`Database error: ${operation} on ${table}`, {
        error: error.message,
        stack: isDevelopment ? error.stack : undefined
      }, 'DATABASE');
    }
  };

  /**
   * File processing logging
   */
  file = {
    upload: (fileName: string, size: number) => {
      this.info(`File upload: ${fileName}`, { size }, 'FILE_PROCESSING');
    },
    
    process: (fileName: string, rows: number, duration: number) => {
      this.info(`File processed: ${fileName}`, { rows, duration }, 'FILE_PROCESSING');
    },
    
    error: (fileName: string, error: Error) => {
      this.error(`File processing error: ${fileName}`, {
        error: error.message
      }, 'FILE_PROCESSING');
    }
  };
}

// Singleton instance
export const productionLogger = ProductionLogger.getInstance();

// Convenience exports for backward compatibility
export const plog = productionLogger;

// Migration helpers for replacing console statements
export const migrationLogger = {
  // Direct replacements for console statements
  log: (message: string, ...data: any[]) => {
    productionLogger.info(message, data.length === 1 ? data[0] : data);
  },
  
  warn: (message: string, ...data: any[]) => {
    productionLogger.warn(message, data.length === 1 ? data[0] : data);
  },
  
  error: (message: string, ...data: any[]) => {
    productionLogger.error(message, data.length === 1 ? data[0] : data);
  },
  
  // Context-aware replacements
  withContext: (context: string) => ({
    log: (message: string, ...data: any[]) => {
      productionLogger.info(message, data.length === 1 ? data[0] : data, context);
    },
    warn: (message: string, ...data: any[]) => {
      productionLogger.warn(message, data.length === 1 ? data[0] : data, context);
    },
    error: (message: string, ...data: any[]) => {
      productionLogger.error(message, data.length === 1 ? data[0] : data, context);
    }
  })
};
