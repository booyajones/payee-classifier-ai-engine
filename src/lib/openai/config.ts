
// Optimized timeout for better reliability and speed
export const DEFAULT_API_TIMEOUT = 20000; // Increased to 20 seconds for batch processing

// Optimized batch size for faster processing
export const MAX_BATCH_SIZE = 15; // Increased for better throughput

// HIGH-ACCURACY AI CONFIGURATION - Use flagship model for 90%+ confidence
export const CLASSIFICATION_MODEL = 'gpt-4.1-2025-04-14';
export const MINIMUM_CONFIDENCE_THRESHOLD = 85;
export const HIGH_ACCURACY_MODE = true;

// Enhanced processing configuration
export const ENHANCED_PROCESSING = {
  BATCH_SIZE: 15,
  MAX_PARALLEL_BATCHES: 3,
  CACHE_TTL: 30 * 60 * 1000, // 30 minutes
  MAX_RETRIES: 3,
  RETRY_DELAY_BASE: 1000
};
