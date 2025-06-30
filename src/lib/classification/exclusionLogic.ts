
import { COMPREHENSIVE_EXCLUSION_KEYWORDS } from './exclusionKeywords';

export interface ExclusionResult {
  isExcluded: boolean;
  matchedKeywords: string[];
  originalName: string;
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
