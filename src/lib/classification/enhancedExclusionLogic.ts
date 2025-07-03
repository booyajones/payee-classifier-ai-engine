
import { 
  getComprehensiveExclusionKeywords, 
  validateExclusionKeywords 
} from './keywordExclusion';
import { advancedNormalization } from './stringMatching';
import { KEYWORD_EXCLUSION_CONFIG } from './config';
import { normalizeKeywordForMatching } from './exclusionNormalization';
import { applyMatchingStrategies } from './exclusionMatching';
import { 
  buildExclusionResult, 
  logATTDebugging, 
  logExclusionResult,
  type KeywordExclusionResult 
} from './exclusionResult';

/**
 * Enhanced keyword exclusion with improved special character handling
 */
export async function checkEnhancedKeywordExclusion(
  payeeName: string,
  customKeywords?: string[]
): Promise<KeywordExclusionResult> {
  productionLogger.debug(`[ENHANCED EXCLUSION] Processing: "${payeeName}"`);
  
  if (!payeeName || typeof payeeName !== 'string') {
    productionLogger.debug('[ENHANCED EXCLUSION] Invalid input - excluding by default');
    return {
      isExcluded: true,
      matchedKeywords: ['invalid-input'],
      confidence: 100,
      reasoning: 'Invalid or empty payee name - excluded for safety'
    };
  }

  const keywords = customKeywords || await getComprehensiveExclusionKeywords();
  const normalizedPayee = advancedNormalization(payeeName);
  
  productionLogger.debug(`[ENHANCED EXCLUSION] Normalized "${payeeName}" -> "${normalizedPayee}"`);
  
  // Special debugging for AT&T variants
  if (payeeName.toUpperCase().includes('AT') && (payeeName.includes('&') || payeeName.includes('T'))) {
    productionLogger.debug(`[ENHANCED EXCLUSION] [AT&T DEBUG] Processing AT&T variant: "${payeeName}"`);
    productionLogger.debug(`[ENHANCED EXCLUSION] [AT&T DEBUG] Normalized: "${normalizedPayee}"`);
  }

  const matchedKeywords: string[] = [];
  const normalizedKeywords: string[] = [];
  let highestConfidence = 0;
  let bestReasoning = '';

  // Check each exclusion keyword with enhanced normalization
  for (const keyword of keywords) {
    if (!keyword || typeof keyword !== 'string') continue;
    
    const originalKeyword = keyword.trim();
    const normalizedKeyword = normalizeKeywordForMatching(originalKeyword);
    normalizedKeywords.push(normalizedKeyword);
    
    // Special debugging for AT&T related keywords
    if (originalKeyword.toUpperCase().includes('AT') && (originalKeyword.includes('&') || originalKeyword.includes('T'))) {
      productionLogger.debug(`[ENHANCED EXCLUSION] [AT&T DEBUG] Checking keyword: "${originalKeyword}" -> "${normalizedKeyword}"`);
    }
    
    const matchResult = applyMatchingStrategies(normalizedPayee, normalizedKeyword);

    if (matchResult.isMatch) {
      matchedKeywords.push(originalKeyword);
      if (matchResult.confidence > highestConfidence) {
        highestConfidence = matchResult.confidence;
        bestReasoning = `Matched "${originalKeyword}" via ${matchResult.matchReason}`;
      }
      
      // Special logging for AT&T matches
      if (originalKeyword.toUpperCase().includes('AT') && (originalKeyword.includes('&') || originalKeyword.includes('T'))) {
        productionLogger.debug(`[ENHANCED EXCLUSION] [AT&T DEBUG] ✓ MATCHED: "${payeeName}" -> "${originalKeyword}" (${matchResult.matchReason}, ${matchResult.confidence}% confidence)`);
      }
      
      productionLogger.debug(`[ENHANCED EXCLUSION] ✓ MATCH: "${payeeName}" -> "${originalKeyword}" (${matchResult.matchReason})`);
    }
  }

  const result = buildExclusionResult(
    payeeName,
    normalizedPayee,
    matchedKeywords,
    highestConfidence,
    bestReasoning,
    keywords,
    normalizedKeywords
  );

  // Log debugging information
  logATTDebugging(payeeName, result);
  logExclusionResult(payeeName, result);

  return result;
}

/**
 * Bulk keyword exclusion processing with enhanced logging
 */
export async function bulkEnhancedKeywordExclusion(
  payeeNames: string[],
  customKeywords?: string[]
): Promise<KeywordExclusionResult[]> {
  productionLogger.debug(`[BULK ENHANCED EXCLUSION] Processing ${payeeNames.length} names`);
  
  const results = await Promise.all(payeeNames.map(async (name, index) => {
    productionLogger.debug(`[BULK ENHANCED EXCLUSION] Processing ${index + 1}/${payeeNames.length}: "${name}"`);
    return await checkEnhancedKeywordExclusion(name, customKeywords);
  }));

  const excludedCount = results.filter(r => r.isExcluded).length;
  productionLogger.debug(`[BULK ENHANCED EXCLUSION] Complete: ${excludedCount}/${payeeNames.length} excluded`);
  
  // Log AT&T specific results
  const attResults = results.filter((_, i) => {
    const name = payeeNames[i].toUpperCase();
    return name.includes('AT') && (name.includes('&') || name.includes('T'));
  });
  
  if (attResults.length > 0) {
    productionLogger.debug('[BULK ENHANCED EXCLUSION] [AT&T DEBUG] AT&T variant results:', 
      attResults.map((result, i) => ({
        name: payeeNames[results.indexOf(result)],
        excluded: result.isExcluded,
        matches: result.matchedKeywords
      }))
    );
  }

  return results;
}
