
import { KeywordExclusionResult, SimilarityScores } from '../types';
import { calculateCombinedSimilarity, advancedNormalization } from './stringMatching';
import { getComprehensiveExclusionKeywords } from './keywordExclusion';

/**
 * Check if a keyword matches as a whole word in the text
 */
function isWholeWordMatch(text: string, keyword: string): boolean {
  // Create a regex pattern with word boundaries
  // \b ensures the keyword is matched as a complete word, not part of another word
  const pattern = new RegExp(`\\b${keyword}\\b`, 'i');
  return pattern.test(text);
}

/**
 * Enhanced keyword exclusion with similarity matching and detailed results
 * Always uses the comprehensive keyword list with WHOLE WORD matching only
 */
export function checkKeywordExclusion(payeeName: string, customKeywords?: string[]): KeywordExclusionResult {
  // Use comprehensive keywords as default, allow custom override for testing
  const exclusionKeywords = customKeywords || getComprehensiveExclusionKeywords();
  
  console.log(`[ENHANCED KEYWORD EXCLUSION] Checking "${payeeName}" against ${exclusionKeywords.length} keywords (WHOLE WORD MATCHING)`);
  
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
    
    // WHOLE WORD match in normalized name using word boundaries
    if (isWholeWordMatch(normalized, normalizedKeyword)) {
      matchedKeywords.push(keyword);
      console.log(`[ENHANCED KEYWORD EXCLUSION] ✓ WHOLE WORD match found: "${keyword}" in "${payeeName}"`);
      continue;
    }
    
    // Token-level exact match (this was already correct - tokens are whole words)
    if (tokens.some(token => token === normalizedKeyword)) {
      matchedKeywords.push(keyword);
      console.log(`[ENHANCED KEYWORD EXCLUSION] ✓ TOKEN match found: "${keyword}" matches token in "${payeeName}"`);
      continue;
    }
    
    // Fuzzy matching ONLY on individual tokens (not partial strings within words)
    for (const token of tokens) {
      const tokenSimilarity = calculateCombinedSimilarity(token, normalizedKeyword);
      if (tokenSimilarity.combined >= 90) { // Very high threshold for token fuzzy matches
        similarities.push({ keyword, similarity: tokenSimilarity.combined, scores: tokenSimilarity });
        console.log(`[ENHANCED KEYWORD EXCLUSION] ✓ FUZZY TOKEN match: "${keyword}" vs token "${token}" (${tokenSimilarity.combined.toFixed(1)}%)`);
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
  
  console.log(`[ENHANCED KEYWORD EXCLUSION] Result for "${payeeName}": ${isExcluded ? 'EXCLUDED' : 'NOT EXCLUDED'} (${matchedKeywords.join(', ')})`);
  
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
export function bulkKeywordExclusion(payeeNames: string[]): Map<string, KeywordExclusionResult> {
  console.log(`[ENHANCED KEYWORD EXCLUSION] Bulk processing ${payeeNames.length} payees (WHOLE WORD MATCHING)`);
  const results = new Map<string, KeywordExclusionResult>();
  
  for (const name of payeeNames) {
    results.set(name, checkKeywordExclusion(name));
  }
  
  const excludedCount = Array.from(results.values()).filter(r => r.isExcluded).length;
  console.log(`[ENHANCED KEYWORD EXCLUSION] Bulk result: ${excludedCount}/${payeeNames.length} excluded`);
  
  return results;
}
