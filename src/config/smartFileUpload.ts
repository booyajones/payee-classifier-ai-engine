
/**
 * Smart File Upload System Configuration
 */

export const SMART_FILE_UPLOAD_CONFIG = {
  // File Processing Limits
  FILE_LIMITS: {
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
    MAX_RECORDS: 100000, // 100k records
    LARGE_FILE_THRESHOLD: 45000, // Records threshold for local processing
    CHUNK_SIZE: 1000, // Default chunk size for processing
    MAX_COLUMNS: 50, // Maximum columns to process
  },

  // Performance Settings
  PERFORMANCE: {
    VIRTUALIZATION_THRESHOLD: 1000, // Items threshold for virtualization
    MEMORY_WARNING_THRESHOLD: 0.7, // 70% memory usage warning
    BATCH_SIZE: 500, // Items per processing batch
    DEBOUNCE_DELAY: 300, // ms delay for search/filter operations
    LAZY_LOADING_THRESHOLD: 100, // Items threshold for lazy loading
  },

  // API Configuration
  API: {
    BATCH_JOB_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // Base delay in ms
    POLLING_INTERVAL: 10000, // 10 seconds
    REQUEST_TIMEOUT: 60000, // 60 seconds
  },

  // UI Settings
  UI: {
    PROGRESS_UPDATE_INTERVAL: 500, // ms between progress updates
    TOAST_DURATION: 5000, // Toast display duration
    ANIMATION_DURATION: 200, // UI animation duration
    TABLE_ROW_HEIGHT: 48, // px
    MAX_TABLE_HEIGHT: 600, // px
  },

  // File Format Support
  SUPPORTED_FORMATS: {
    EXCEL: ['.xlsx', '.xls'],
    CSV: ['.csv'],
    MAX_COLUMNS_EXCEL: 16384, // Excel column limit
    MAX_ROWS_EXCEL: 1048576, // Excel row limit
  },

  // Error Handling
  ERROR_HANDLING: {
    MAX_ERROR_LOG_SIZE: 100, // Maximum error entries to keep
    AUTO_RETRY_DELAY: 5000, // Auto retry delay in ms
    CRITICAL_ERROR_THRESHOLD: 5, // Errors before marking as critical
    RECOVERY_ATTEMPT_LIMIT: 3, // Maximum recovery attempts
  },

  // Feature Flags
  FEATURES: {
    ENABLE_PERFORMANCE_MONITORING: false,
    ENABLE_MEMORY_OPTIMIZATION: true,
    ENABLE_AUTO_RECOVERY: true,
    ENABLE_BATCH_PROCESSING: true,
    ENABLE_LOCAL_PROCESSING: true,
    ENABLE_PROGRESS_PERSISTENCE: true,
  },

  // Development Settings
  DEBUG: {
    ENABLE_CONSOLE_LOGGING: process.env.NODE_ENV === 'development',
    ENABLE_PERFORMANCE_TRACKING: false,
    MOCK_API_RESPONSES: false,
    SIMULATE_SLOW_PROCESSING: false,
  }
} as const;

// Type definitions for configuration
export type SmartFileUploadConfig = typeof SMART_FILE_UPLOAD_CONFIG;

// Utility functions for configuration access
export const getConfig = () => SMART_FILE_UPLOAD_CONFIG;

export const isFeatureEnabled = (feature: keyof typeof SMART_FILE_UPLOAD_CONFIG.FEATURES): boolean => {
  return SMART_FILE_UPLOAD_CONFIG.FEATURES[feature];
};

export const getFileLimit = (limit: keyof typeof SMART_FILE_UPLOAD_CONFIG.FILE_LIMITS): number => {
  return SMART_FILE_UPLOAD_CONFIG.FILE_LIMITS[limit];
};

export const getPerformanceSetting = (setting: keyof typeof SMART_FILE_UPLOAD_CONFIG.PERFORMANCE): number => {
  return SMART_FILE_UPLOAD_CONFIG.PERFORMANCE[setting];
};

// Configuration validation
export const validateConfig = (): boolean => {
  const config = getConfig();
  
  // Validate file limits
  if (config.FILE_LIMITS.MAX_FILE_SIZE <= 0) {
    productionLogger.error('Invalid MAX_FILE_SIZE configuration');
    return false;
  }
  
  // Validate performance settings
  if (config.PERFORMANCE.VIRTUALIZATION_THRESHOLD <= 0) {
    productionLogger.error('Invalid VIRTUALIZATION_THRESHOLD configuration');
    return false;
  }
  
  // Validate API settings
  if (config.API.BATCH_JOB_TIMEOUT <= 0) {
    productionLogger.error('Invalid BATCH_JOB_TIMEOUT configuration');
    return false;
  }
  
  productionLogger.debug('[CONFIG] Configuration validation passed');
  return true;
};

// Initialize configuration on load
if (typeof window !== 'undefined') {
  validateConfig();
}
