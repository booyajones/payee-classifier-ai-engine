
import { COMPREHENSIVE_EXCLUSION_KEYWORDS, DEFAULT_EXCLUSION_KEYWORDS } from './exclusionKeywords';

const CUSTOM_KEYWORDS_STORAGE_KEY = 'custom-exclusion-keywords';

/**
 * Load custom keywords from localStorage
 */
function loadCustomKeywords(): string[] {
  try {
    if (typeof window === 'undefined') return []; // Server-side check
    const stored = localStorage.getItem(CUSTOM_KEYWORDS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading custom keywords:', error);
    return [];
  }
}

/**
 * Get the comprehensive exclusion keywords list combined with custom keywords
 */
export function getComprehensiveExclusionKeywords(): string[] {
  const comprehensiveKeywords = COMPREHENSIVE_EXCLUSION_KEYWORDS;
  const customKeywords = loadCustomKeywords();
  
  const combined = [...comprehensiveKeywords, ...customKeywords];
  
  console.log(`[KEYWORD EXCLUSION] Loaded ${comprehensiveKeywords.length} comprehensive + ${customKeywords.length} custom = ${combined.length} total keywords`);
  
  // Log some sample keywords to verify they're loaded
  const bankKeywords = combined.filter(k => k.toUpperCase().includes('BANK'));
  const attKeywords = combined.filter(k => k.toUpperCase().includes('AT') && (k.includes('&') || k.includes('T')));
  
  console.log(`[KEYWORD EXCLUSION] BANK-related keywords found: ${bankKeywords.length}`);
  console.log(`[KEYWORD EXCLUSION] AT&T-related keywords found: ${attKeywords.length}`);
  
  return combined;
}

/**
 * Get only the built-in comprehensive keywords (without custom ones)
 */
export function getBuiltInExclusionKeywords(): string[] {
  return COMPREHENSIVE_EXCLUSION_KEYWORDS;
}

/**
 * Get only the custom keywords from localStorage
 */
export function getCustomExclusionKeywords(): string[] {
  return loadCustomKeywords();
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
