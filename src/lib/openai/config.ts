
// Optimized timeout for better reliability and speed
export const DEFAULT_API_TIMEOUT = 20000; // Increased to 20 seconds for batch processing

// Optimized batch size for faster processing
export const MAX_BATCH_SIZE = 15; // Increased for better throughput

// Use the flagship model for best accuracy and reliability
export const CLASSIFICATION_MODEL = 'gpt-4.1-2025-04-14';

// Enhanced processing configuration
export const ENHANCED_PROCESSING = {
  BATCH_SIZE: 15,
  MAX_PARALLEL_BATCHES: 3,
  CACHE_TTL: 30 * 60 * 1000, // 30 minutes
  MAX_RETRIES: 3,
  RETRY_DELAY_BASE: 1000
};
