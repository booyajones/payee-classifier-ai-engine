
import { COMPREHENSIVE_EXCLUSION_KEYWORDS, DEFAULT_EXCLUSION_KEYWORDS } from './exclusionKeywords';

/**
 * Get the comprehensive exclusion keywords
 */
export function getComprehensiveExclusionKeywords(): string[] {
  return [...COMPREHENSIVE_EXCLUSION_KEYWORDS];
}

/**
 * Get the default (basic) exclusion keywords for backward compatibility
 */
export function getDefaultExclusionKeywords(): string[] {
  return [...DEFAULT_EXCLUSION_KEYWORDS];
}

/**
 * Validate exclusion keywords array
 */
export function validateExclusionKeywords(keywords: string[]): string[] {
  if (!Array.isArray(keywords)) {
    console.warn('[EXCLUSION] Invalid keywords array, using comprehensive list');
    return COMPREHENSIVE_EXCLUSION_KEYWORDS;
  }

  return keywords
    .filter(keyword => keyword && typeof keyword === 'string' && keyword.trim())
    .map(keyword => keyword.trim());
}
