
import { COMPREHENSIVE_EXCLUSION_KEYWORDS, DEFAULT_EXCLUSION_KEYWORDS } from './exclusionKeywords';

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

/**
 * Validate exclusion keywords array
 */
export function validateExclusionKeywords(keywords: string[]): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!Array.isArray(keywords)) {
    errors.push('Keywords must be an array');
    return { isValid: false, errors, warnings };
  }
  
  if (keywords.length === 0) {
    warnings.push('No exclusion keywords provided');
  }
  
  const duplicates = keywords.filter((item, index) => keywords.indexOf(item) !== index);
  if (duplicates.length > 0) {
    warnings.push(`Duplicate keywords found: ${duplicates.join(', ')}`);
  }
  
  const emptyKeywords = keywords.filter(k => !k || typeof k !== 'string' || k.trim() === '');
  if (emptyKeywords.length > 0) {
    errors.push(`${emptyKeywords.length} empty or invalid keywords found`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
