/**
 * @deprecated This file is maintained for backward compatibility.
 * Please import from '@/lib/services/batchJobName' instead.
 */

// Re-export everything from the new modular structure
export {
  generateBatchJobName,
  generateContextualBatchJobName,
  getPremiumBatchJobName,
  type JobContext,
  FINANCIAL_THEMES,
  TIME_BASED_PREFIXES,
  SIZE_BASED_NAMES,
  PREMIUM_BATCH_NAMES,
  getRandomElement,
  getSizeCategory,
  getTimeCategory,
  cleanFileName
} from './batchJobName';