
import { KeywordExclusionResult, SimilarityScores } from '../types';
import { calculateCombinedSimilarity, advancedNormalization } from './stringMatching';
import { isWholeWordMatch, testRegexPatterns, testNormalization } from './patternMatching';
import { getComprehensiveExclusionKeywords } from './keywordExclusion';

/**
 * Enhanced keyword exclusion with similarity matching and detailed results
 * Always uses the comprehensive keyword list with WHOLE WORD matching only
 */
export function checkEnhancedKeywordExclusion(payeeName: string, customKeywords?: string[]): KeywordExclusionResult {
  console.log(`\n[ENHANCED KEYWORD EXCLUSION] === STARTING EXCLUSION CHECK FOR "${payeeName}" ===`);
  
  // Run debug tests first
  testRegexPatterns();
  testNormalization();
  
  // Use comprehensive keywords as default, allow custom override for testing
  const exclusionKeywords = customKeywords || getComprehensiveExclusionKeywords();
  
  console.log(`[ENHANCED KEYWORD EXCLUSION] Checking "${payeeName}" against ${exclusionKeywords.length} keywords (WHOLE WORD MATCHING)`);
  console.log(`[ENHANCED KEYWORD EXCLUSION] Sample keywords: [${exclusionKeywords.slice(0, 10).join(', ')}]`);
  
  // Check if BANK is in keywords
  const hasBankKeyword = exclusionKeywords.some(k => k.toUpperCase().includes('BANK'));
  console.log(`[ENHANCED KEYWORD EXCLUSION] Contains BANK keyword: ${hasBankKeyword}`);
  
  if (exclusionKeywords.length === 0) {
    console.warn('[ENHANCED KEYWORD EXCLUSION] No exclusion keywords available');
    return {
      isExcluded: false,
      matchedKeywords: [],
      confidence: 0,
      reasoning: 'No exclusion keywords configured'
    };
  }
  
  const { normalized, tokens } = advancedNormalization(payeeName);
  const matchedKeywords: string[] = [];
  const similarities: Array<{ keyword: string; similarity: number; scores: SimilarityScores }> = [];
  
  console.log(`[ENHANCED KEYWORD EXCLUSION] Normalized: "${normalized}", Tokens: [${tokens.join(', ')}]`);
  
  // Check for exact WHOLE WORD matches first
  for (const keyword of exclusionKeywords) {
    const normalizedKeyword = keyword.toUpperCase().trim();
    console.log(`[ENHANCED KEYWORD EXCLUSION] Testing keyword: "${normalizedKeyword}"`);
    
    // WHOLE WORD match in normalized name using word boundaries
    if (isWholeWordMatch(normalized, normalizedKeyword)) {
      matchedKeywords.push(keyword);
      console.log(`[ENHANCED KEYWORD EXCLUSION] ✅ WHOLE WORD match found: "${keyword}" in "${payeeName}"`);
      continue;
    }
    
    // Token-level exact match (this was already correct - tokens are whole words)
    const tokenMatch = tokens.some(token => {
      const matches = token === normalizedKeyword;
      if (matches) {
        console.log(`[ENHANCED KEYWORD EXCLUSION] ✅ TOKEN exact match: "${normalizedKeyword}" matches token "${token}"`);
      }
      return matches;
    });
    
    if (tokenMatch) {
      matchedKeywords.push(keyword);
      continue;
    }
    
    // Fuzzy matching ONLY on individual tokens (not partial strings within words)
    for (const token of tokens) {
      const tokenSimilarity = calculateCombinedSimilarity(token, normalizedKeyword);
      if (tokenSimilarity.combined >= 90) { // Very high threshold for token fuzzy matches
        similarities.push({ keyword, similarity: tokenSimilarity.combined, scores: tokenSimilarity });
        console.log(`[ENHANCED KEYWORD EXCLUSION] ✅ FUZZY TOKEN match: "${keyword}" vs token "${token}" (${tokenSimilarity.combined.toFixed(1)}%)`);
        break; // Only match once per keyword
      }
    }
  }
  
  // Add fuzzy matches to matched keywords
  similarities.forEach(({ keyword }) => {
    if (!matchedKeywords.includes(keyword)) {
      matchedKeywords.push(keyword);
    }
  });
  
  const isExcluded = matchedKeywords.length > 0;
  const confidence = isExcluded ? Math.max(
    ...similarities.map(s => s.similarity),
    matchedKeywords.length > similarities.length ? 100 : 0 // 100% for exact matches
  ) : 0;
  
  let reasoning = '';
  if (isExcluded) {
    const exactMatches = matchedKeywords.filter(k => 
      !similarities.some(s => s.keyword === k)
    );
    const fuzzyMatches = similarities.map(s => 
      `${s.keyword} (${s.similarity.toFixed(1)}% similar)`
    );
    
    const parts = [];
    if (exactMatches.length > 0) {
      parts.push(`Whole word matches: ${exactMatches.join(', ')}`);
    }
    if (fuzzyMatches.length > 0) {
      parts.push(`Fuzzy token matches: ${fuzzyMatches.join(', ')}`);
    }
    
    reasoning = `Excluded due to keyword matches - ${parts.join('; ')}`;
  } else {
    reasoning = 'No exclusion keywords matched (whole word matching)';
  }
  
  console.log(`[ENHANCED KEYWORD EXCLUSION] === FINAL RESULT FOR "${payeeName}" ===`);
  console.log(`[ENHANCED KEYWORD EXCLUSION] Result: ${isExcluded ? 'EXCLUDED' : 'NOT EXCLUDED'}`);
  console.log(`[ENHANCED KEYWORD EXCLUSION] Matched Keywords: [${matchedKeywords.join(', ')}]`);
  console.log(`[ENHANCED KEYWORD EXCLUSION] Confidence: ${confidence}%`);
  console.log(`[ENHANCED KEYWORD EXCLUSION] Reasoning: ${reasoning}`);
  
  return {
    isExcluded,
    matchedKeywords,
    confidence,
    reasoning
  };
}

/**
 * Bulk keyword exclusion check for batch processing
 */
export function bulkEnhancedKeywordExclusion(payeeNames: string[]): Map<string, KeywordExclusionResult> {
  console.log(`[ENHANCED KEYWORD EXCLUSION] Bulk processing ${payeeNames.length} payees (WHOLE WORD MATCHING)`);
  const results = new Map<string, KeywordExclusionResult>();
  
  for (const name of payeeNames) {
    results.set(name, checkEnhancedKeywordExclusion(name));
  }
  
  const excludedCount = Array.from(results.values()).filter(r => r.isExcluded).length;
  console.log(`[ENHANCED KEYWORD EXCLUSION] Bulk result: ${excludedCount}/${payeeNames.length} excluded`);
  
  return results;
}
