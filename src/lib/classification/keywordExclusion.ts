
import { COMPREHENSIVE_EXCLUSION_KEYWORDS, DEFAULT_EXCLUSION_KEYWORDS } from './exclusionKeywords';
import { loadCustomExclusionKeywords } from '../database/exclusionKeywordService';

export interface ExclusionResult {
  isExcluded: boolean;
  matchedKeywords: string[];
  originalName: string;
}

// Cache for custom keywords to avoid repeated database calls
let customKeywordsCache: string[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Load custom keywords from database with caching
 */
async function loadCustomKeywords(): Promise<string[]> {
  const now = Date.now();
  
  // Return cached keywords if cache is still valid
  if (customKeywordsCache.length > 0 && now - cacheTimestamp < CACHE_DURATION) {
    return customKeywordsCache;
  }

  try {
    const keywords = await loadCustomExclusionKeywords();
    customKeywordsCache = keywords;
    cacheTimestamp = now;
    return keywords;
  } catch (error) {
    console.error('Error loading custom keywords:', error);
    return customKeywordsCache; // Return cached data if available
  }
}

/**
 * Clear the custom keywords cache (call when keywords are modified)
 */
export function clearCustomKeywordsCache(): void {
  customKeywordsCache = [];
  cacheTimestamp = 0;
}

/**
 * Get the comprehensive exclusion keywords list combined with custom keywords
 */
export async function getComprehensiveExclusionKeywords(): Promise<string[]> {
  const comprehensiveKeywords = COMPREHENSIVE_EXCLUSION_KEYWORDS;
  const customKeywords = await loadCustomKeywords();
  
  const combined = [...comprehensiveKeywords, ...customKeywords];
  
  console.log(`[KEYWORD EXCLUSION] Loaded ${comprehensiveKeywords.length} comprehensive + ${customKeywords.length} custom = ${combined.length} total keywords`);
  
  return combined;
}

/**
 * Get only the built-in comprehensive keywords (without custom ones)
 */
export function getBuiltInExclusionKeywords(): string[] {
  return COMPREHENSIVE_EXCLUSION_KEYWORDS;
}

/**
 * Get only the custom keywords from database
 */
export async function getCustomExclusionKeywords(): Promise<string[]> {
  return await loadCustomKeywords();
}

/**
 * Get the default (basic) exclusion keywords for backward compatibility
 */
export function getDefaultExclusionKeywords(): string[] {
  return DEFAULT_EXCLUSION_KEYWORDS;
}

/**
 * Check if a payee name contains any exclusion keywords using whole word matching
 */
export function checkKeywordExclusion(
  payeeName: string, 
  exclusionKeywords: string[] = COMPREHENSIVE_EXCLUSION_KEYWORDS
): ExclusionResult {
  if (!payeeName || typeof payeeName !== 'string') {
    return {
      isExcluded: true,
      matchedKeywords: ['invalid-input'],
      originalName: payeeName
    };
  }

  const normalizedName = payeeName.toUpperCase().trim();
  const matchedKeywords: string[] = [];

  // Check each exclusion keyword using whole word matching with regex
  for (const keyword of exclusionKeywords) {
    if (!keyword || typeof keyword !== 'string') continue;
    
    const normalizedKeyword = keyword.toUpperCase().trim();
    if (!normalizedKeyword) continue;

    // Use whole word matching with regex instead of simple includes
    const pattern = new RegExp(`\\b${normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (pattern.test(normalizedName)) {
      matchedKeywords.push(keyword);
    }
  }

  return {
    isExcluded: matchedKeywords.length > 0,
    matchedKeywords,
    originalName: payeeName
  };
}

/**
 * Filter an array of payee names, separating excluded from valid ones
 */
export function filterPayeeNames(
  payeeNames: string[],
  exclusionKeywords: string[] = COMPREHENSIVE_EXCLUSION_KEYWORDS
): {
  validNames: string[];
  excludedNames: Array<{ name: string; reason: string[] }>;
} {
  const validNames: string[] = [];
  const excludedNames: Array<{ name: string; reason: string[] }> = [];

  for (const name of payeeNames) {
    const exclusionResult = checkKeywordExclusion(name, exclusionKeywords);
    
    if (exclusionResult.isExcluded) {
      excludedNames.push({
        name: name,
        reason: exclusionResult.matchedKeywords
      });
    } else {
      validNames.push(name);
    }
  }

  return { validNames, excludedNames };
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
