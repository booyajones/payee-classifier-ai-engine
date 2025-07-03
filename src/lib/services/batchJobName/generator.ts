/**
 * Core batch job name generation logic
 */

import { FINANCIAL_THEMES, PREMIUM_BATCH_NAMES } from './themes';
import {
  getRandomElement,
  getSizeCategory,
  getTimeCategory,
  getRandomPrefix,
  getRandomMainTerm,
  getSuffix,
  getTimeBasedName,
  cleanFileName
} from './utils';

export interface JobContext {
  payeeCount?: number;
  fileName?: string;
  uploadTime?: Date;
  hasTextInput?: boolean;
}

/**
 * Generate a creative financial-themed name for a batch job
 */
export function generateBatchJobName(context: JobContext = {}): string {
  const { payeeCount = 0, fileName, uploadTime = new Date(), hasTextInput = false } = context;
  
  // Determine size category
  const sizeCategory = getSizeCategory(payeeCount);
  const timeCategory = getTimeCategory(uploadTime);
  
  // Generate name components
  const prefix = getRandomPrefix(sizeCategory, timeCategory);
  const mainTerm = getRandomMainTerm();
  const actionWord = getRandomElement(FINANCIAL_THEMES.actionWords);
  
  // Create different name patterns
  const patterns = [
    `${prefix} ${mainTerm} ${actionWord}`,
    `${mainTerm} ${actionWord} ${getSuffix(payeeCount)}`,
    `${prefix} ${getRandomElement(FINANCIAL_THEMES.actions)} ${getRandomElement(FINANCIAL_THEMES.business)}`,
    `${getRandomElement(FINANCIAL_THEMES.descriptors)} ${mainTerm} ${getRandomElement(FINANCIAL_THEMES.actions)}`,
    `${getTimeBasedName(uploadTime)} ${mainTerm} ${actionWord}`
  ];
  
  // Add special patterns for text input
  if (hasTextInput) {
    patterns.push(
      `Custom ${mainTerm} ${actionWord}`,
      `Manual ${getRandomElement(FINANCIAL_THEMES.business)} ${getRandomElement(FINANCIAL_THEMES.actions)}`
    );
  }
  
  // Add filename-based patterns
  if (fileName) {
    const cleanedFileName = cleanFileName(fileName);
    patterns.push(
      `${cleanedFileName} ${mainTerm} ${getRandomElement(FINANCIAL_THEMES.actions)}`,
      `${prefix} ${cleanedFileName} ${actionWord}`
    );
  }
  
  return getRandomElement(patterns);
}

/**
 * Generate a batch job name with explicit context
 */
export function generateContextualBatchJobName(
  payeeCount: number,
  source: 'file' | 'text' = 'file',
  fileName?: string
): string {
  return generateBatchJobName({
    payeeCount,
    fileName,
    uploadTime: new Date(),
    hasTextInput: source === 'text'
  });
}

/**
 * Get a premium batch job name
 */
export function getPremiumBatchJobName(): string {
  return getRandomElement(PREMIUM_BATCH_NAMES);
}
