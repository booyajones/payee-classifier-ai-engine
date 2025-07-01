/**
 * Environment-based configuration for production optimization
 */

export const ENV_CONFIG = {
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  isTesting: import.meta.env.MODE === 'test',
  
  // Feature flags
  features: {
    devTools: import.meta.env.DEV,
    performanceMonitoring: true,
    detailedLogging: import.meta.env.DEV,
    errorReporting: import.meta.env.PROD,
    analytics: import.meta.env.PROD
  },
  
  // Performance settings
  performance: {
    batchSize: import.meta.env.PROD ? 50 : 10,
    debounceMs: import.meta.env.PROD ? 300 : 100,
    cacheSize: import.meta.env.PROD ? 1000 : 100,
    logThrottleMs: import.meta.env.PROD ? 1000 : 0
  },
  
  // Logging configuration
  logging: {
    level: import.meta.env.DEV ? 'debug' : 'warn',
    maxEntries: import.meta.env.PROD ? 500 : 1000,
    enablePerformanceLogging: import.meta.env.DEV,
    enableMemoryLogging: import.meta.env.DEV
  }
} as const;

export type EnvironmentConfig = typeof ENV_CONFIG;