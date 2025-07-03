/**
 * Financial-Themed Batch Job Name Generator
 * Generates creative, money/finance-themed names for batch jobs
 */

export {
  generateBatchJobName,
  generateContextualBatchJobName,
  getPremiumBatchJobName,
  type JobContext
} from './generator';

export {
  FINANCIAL_THEMES,
  TIME_BASED_PREFIXES,
  SIZE_BASED_NAMES,
  PREMIUM_BATCH_NAMES
} from './themes';

export {
  getRandomElement,
  getSizeCategory,
  getTimeCategory,
  cleanFileName
} from './utils';
