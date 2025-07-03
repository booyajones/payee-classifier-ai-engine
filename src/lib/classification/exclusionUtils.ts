
import { COMPREHENSIVE_EXCLUSION_KEYWORDS, DEFAULT_EXCLUSION_KEYWORDS } from './exclusionKeywords';
import { validateExclusionKeywords, getKeywordStatistics } from './keywordUtils';

/**
 * Get the comprehensive exclusion keywords list
 */
export function getComprehensiveExclusionKeywords(): string[] {
  console.log(`[EXCLUSION UTILS] Returning ${COMPREHENSIVE_EXCLUSION_KEYWORDS.length} comprehensive keywords`);
  
  // Log some sample keywords to verify they're loaded
  const bankKeywords = COMPREHENSIVE_EXCLUSION_KEYWORDS.filter(k => k.toUpperCase().includes('BANK'));
  console.log(`[EXCLUSION UTILS] BANK-related keywords found: [${bankKeywords.join(', ')}]`);
  
  return COMPREHENSIVE_EXCLUSION_KEYWORDS;
}

/**
 * Get the default (basic) exclusion keywords for backward compatibility
 */
export function getDefaultExclusionKeywords(): string[] {
  return DEFAULT_EXCLUSION_KEYWORDS;
}

// Re-export validation functions for backward compatibility
export { validateExclusionKeywords, getKeywordStatistics };
