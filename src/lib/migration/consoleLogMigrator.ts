import { productionLogger } from '@/lib/logging/productionLogger';

/**
 * Utility to systematically replace console.log statements
 * Usage: Replace console.log calls with migrationLogger calls in bulk
 */

// Context mapping for different file types
const CONTEXT_MAP: Record<string, string> = {
  'batch': 'BATCH_OPERATIONS',
  'classification': 'CLASSIFICATION',
  'upload': 'FILE_UPLOAD',
  'download': 'DOWNLOAD',
  'keyword': 'KEYWORD_MANAGER',
  'duplicate': 'DUPLICATE_DETECTION',
  'api': 'API_CALLS',
  'ui': 'UI_COMPONENTS',
  'error': 'ERROR_HANDLING',
  'performance': 'PERFORMANCE',
  'memory': 'MEMORY_MANAGEMENT'
};

/**
 * Migration wrapper for console.log replacement
 */
export class ConsoleLogMigrator {
  /**
   * Replace console.log with context-aware logging
   */
  static log(message: string, data?: any, fileContext?: string) {
    const context = fileContext ? CONTEXT_MAP[fileContext] || fileContext : undefined;
    productionLogger.info(message, data, context);
  }

  /**
   * Replace console.warn with production logger
   */
  static warn(message: string, data?: any, fileContext?: string) {
    const context = fileContext ? CONTEXT_MAP[fileContext] || fileContext : undefined;
    productionLogger.warn(message, data, context);
  }

  /**
   * Replace console.error with production logger
   */
  static error(message: string, data?: any, fileContext?: string) {
    const context = fileContext ? CONTEXT_MAP[fileContext] || fileContext : undefined;
    productionLogger.error(message, data, context);
  }

  /**
   * Debug logging (development only)
   */
  static debug(message: string, data?: any, fileContext?: string) {
    const context = fileContext ? CONTEXT_MAP[fileContext] || fileContext : undefined;
    productionLogger.debug(message, data, context);
  }
}

// Export convenience aliases for easy replacement
export const migrationLog = ConsoleLogMigrator.log;
export const migrationWarn = ConsoleLogMigrator.warn;
export const migrationError = ConsoleLogMigrator.error;
export const migrationDebug = ConsoleLogMigrator.debug;
