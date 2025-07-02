
import { DEFAULT_EXCLUSION_KEYWORDS } from './exclusionKeywords';
import { loadAllExclusionKeywords } from '../database/exclusionKeywordService';

export interface ExclusionResult {
  isExcluded: boolean;
  matchedKeywords: string[];
  originalName: string;
}

// Cache for all keywords to avoid repeated database calls
let allKeywordsCache: string[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Load all keywords from database with caching
 */
async function loadAllKeywords(): Promise<string[]> {
  const now = Date.now();
  
  // Return cached keywords if cache is still valid
  if (allKeywordsCache.length > 0 && now - cacheTimestamp < CACHE_DURATION) {
    return allKeywordsCache;
  }

  try {
    const keywordData = await loadAllExclusionKeywords();
    const keywords = keywordData.map(k => k.keyword);
    allKeywordsCache = keywords;
    cacheTimestamp = now;
    return keywords;
  } catch (error) {
    console.error('Error loading all keywords:', error);
    return allKeywordsCache; // Return cached data if available
  }
}

/**
 * Clear the keywords cache (call when keywords are modified)
 */
export function clearCustomKeywordsCache(): void {
  allKeywordsCache = [];
  cacheTimestamp = 0;
}

/**
 * Get all exclusion keywords from database
 */
export async function getComprehensiveExclusionKeywords(): Promise<string[]> {
  const allKeywords = await loadAllKeywords();
  
  console.log(`[KEYWORD EXCLUSION] Loaded ${allKeywords.length} total keywords from database`);
  
  return allKeywords;
}

/**
 * Get only the built-in keywords from database (for backwards compatibility)
 */
export async function getBuiltInExclusionKeywords(): Promise<string[]> {
  try {
    const keywordData = await loadAllExclusionKeywords();
    const builtinKeywords = keywordData
      .filter(k => k.keyword_type === 'builtin')
      .map(k => k.keyword);
    return builtinKeywords;
  } catch (error) {
    console.error('Error loading built-in keywords:', error);
    return [];
  }
}

/**
 * Get only the custom keywords from database
 */
export async function getCustomExclusionKeywords(): Promise<string[]> {
  try {
    const keywordData = await loadAllExclusionKeywords();
    const customKeywords = keywordData
      .filter(k => k.keyword_type === 'custom')
      .map(k => k.keyword);
    return customKeywords;
  } catch (error) {
    console.error('Error loading custom keywords:', error);
    return [];
  }
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
export async function checkKeywordExclusion(
  payeeName: string, 
  exclusionKeywords?: string[]
): Promise<ExclusionResult> {
  // If keywords not provided, load from database
  const keywords = exclusionKeywords || await getComprehensiveExclusionKeywords();
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
  for (const keyword of keywords) {
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
export async function filterPayeeNames(
  payeeNames: string[],
  exclusionKeywords?: string[]
): Promise<{
  validNames: string[];
  excludedNames: Array<{ name: string; reason: string[] }>;
}> {
  const keywords = exclusionKeywords || await getComprehensiveExclusionKeywords();
  const validNames: string[] = [];
  const excludedNames: Array<{ name: string; reason: string[] }> = [];

  for (const name of payeeNames) {
    const exclusionResult = await checkKeywordExclusion(name, keywords);
    
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
