
import { 
  getComprehensiveExclusionKeywords, 
  validateExclusionKeywords 
} from './keywordExclusion';
import { 
  calculateCombinedSimilarity, 
  advancedNormalization,
  type SimilarityScores 
} from './stringMatching';
import { 
  isWholeWordMatch, 
  testRegexPatterns 
} from './patternMatching';
import { KEYWORD_EXCLUSION_CONFIG } from './config';

export interface KeywordExclusionResult {
  isExcluded: boolean;
  matchedKeywords: string[];
  confidence: number;
  reasoning: string;
  similarityScores?: SimilarityScores;
  normalizedInput?: string;
  normalizedKeywords?: string[];
}

/**
 * Normalize a keyword for consistent matching with payee names
 */
function normalizeKeywordForMatching(keyword: string): string {
  if (!keyword || typeof keyword !== 'string') return '';
  
  // Apply the same normalization as used for payee names
  let normalized = advancedNormalization(keyword);
  
  // Special handling for common business patterns
  normalized = normalized
    .replace(/\s*&\s*/g, ' AND ')  // Convert & to AND
    .replace(/\s+AND\s+/g, ' AND ')  // Normalize AND spacing
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .trim();
  
  return normalized;
}

/**
 * Check if normalized tokens match against normalized keyword tokens
 */
function checkTokenMatch(normalizedPayee: string, normalizedKeyword: string): boolean {
  if (!normalizedPayee || !normalizedKeyword) return false;
  
  const payeeTokens = normalizedPayee.split(/\s+/).filter(t => t.length > 0);
  const keywordTokens = normalizedKeyword.split(/\s+/).filter(t => t.length > 0);
  
  // For compound names like AT&T -> ["AT", "T"], check if all keyword tokens are present
  if (keywordTokens.length <= payeeTokens.length) {
    const hasAllTokens = keywordTokens.every(kToken => 
      payeeTokens.some(pToken => pToken === kToken)
    );
    if (hasAllTokens) return true;
  }
  
  // Also check if the full normalized strings match
  return normalizedPayee.includes(normalizedKeyword) || normalizedKeyword.includes(normalizedPayee);
}

/**
 * Enhanced keyword exclusion with improved special character handling
 */
export function checkEnhancedKeywordExclusion(
  payeeName: string,
  customKeywords?: string[]
): KeywordExclusionResult {
  console.log(`[ENHANCED EXCLUSION] Processing: "${payeeName}"`);
  
  if (!payeeName || typeof payeeName !== 'string') {
    console.log('[ENHANCED EXCLUSION] Invalid input - excluding by default');
    return {
      isExcluded: true,
      matchedKeywords: ['invalid-input'],
      confidence: 100,
      reasoning: 'Invalid or empty payee name - excluded for safety'
    };
  }

  const keywords = customKeywords || getComprehensiveExclusionKeywords();
  const normalizedPayee = advancedNormalization(payeeName);
  
  console.log(`[ENHANCED EXCLUSION] Normalized "${payeeName}" -> "${normalizedPayee}"`);
  
  // Special debugging for AT&T variants
  if (payeeName.toUpperCase().includes('AT') && (payeeName.includes('&') || payeeName.includes('T'))) {
    console.log(`[ENHANCED EXCLUSION] [AT&T DEBUG] Processing AT&T variant: "${payeeName}"`);
    console.log(`[ENHANCED EXCLUSION] [AT&T DEBUG] Normalized: "${normalizedPayee}"`);
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
      console.log(`[ENHANCED EXCLUSION] [AT&T DEBUG] Checking keyword: "${originalKeyword}" -> "${normalizedKeyword}"`);
    }
    
    let isMatch = false;
    let confidence = 0;
    let matchReason = '';

    // Method 1: Exact normalized match
    if (normalizedPayee === normalizedKeyword) {
      isMatch = true;
      confidence = 100;
      matchReason = 'Exact normalized match';
    }
    // Method 2: Token-based matching for compound names
    else if (checkTokenMatch(normalizedPayee, normalizedKeyword)) {
      isMatch = true;
      confidence = 95;
      matchReason = 'Token-based match';
    }
    // Method 3: Whole word matching with regex
    else if (isWholeWordMatch(normalizedPayee, normalizedKeyword)) {
      isMatch = true;
      confidence = 90;
      matchReason = 'Whole word match';
    }
    // Method 4: Simple contains check
    else if (normalizedPayee.includes(normalizedKeyword) || normalizedKeyword.includes(normalizedPayee)) {
      isMatch = true;
      confidence = 80;
      matchReason = 'Contains match';
    }
    // Method 5: Similarity scoring for fuzzy matches
    else {
      const similarity = calculateCombinedSimilarity(normalizedPayee, normalizedKeyword);
      if (similarity.combined > 85) {
        isMatch = true;
        confidence = similarity.combined;
        matchReason = `Similarity match (${similarity.combined.toFixed(1)}%)`;
      }
    }

    if (isMatch) {
      matchedKeywords.push(originalKeyword);
      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        bestReasoning = `Matched "${originalKeyword}" via ${matchReason}`;
      }
      
      // Special logging for AT&T matches
      if (originalKeyword.toUpperCase().includes('AT') && (originalKeyword.includes('&') || originalKeyword.includes('T'))) {
        console.log(`[ENHANCED EXCLUSION] [AT&T DEBUG] ✓ MATCHED: "${payeeName}" -> "${originalKeyword}" (${matchReason}, ${confidence}% confidence)`);
      }
      
      console.log(`[ENHANCED EXCLUSION] ✓ MATCH: "${payeeName}" -> "${originalKeyword}" (${matchReason})`);
    }
  }

  const isExcluded = matchedKeywords.length > 0;
  const finalConfidence = isExcluded ? highestConfidence : 0;
  
  const result: KeywordExclusionResult = {
    isExcluded,
    matchedKeywords,
    confidence: finalConfidence,
    reasoning: isExcluded 
      ? `Excluded: ${bestReasoning}. Matched keywords: ${matchedKeywords.join(', ')}`
      : 'No exclusion keywords matched - proceeding to AI classification',
    normalizedInput: normalizedPayee,
    normalizedKeywords: isExcluded ? normalizedKeywords.filter((_, i) => 
      matchedKeywords.includes(keywords[i])
    ) : undefined
  };

  // Special logging for AT&T cases
  if (payeeName.toUpperCase().includes('AT') && (payeeName.includes('&') || payeeName.includes('T'))) {
    console.log(`[ENHANCED EXCLUSION] [AT&T DEBUG] Final result for "${payeeName}":`, {
      isExcluded: result.isExcluded,
      matchedKeywords: result.matchedKeywords,
      confidence: result.confidence
    });
  }

  console.log(`[ENHANCED EXCLUSION] Result for "${payeeName}": ${isExcluded ? 'EXCLUDED' : 'NOT EXCLUDED'} (${finalConfidence}% confidence)`);
  if (isExcluded) {
    console.log(`[ENHANCED EXCLUSION] Matched: ${matchedKeywords.join(', ')}`);
  }

  return result;
}

/**
 * Bulk keyword exclusion processing with enhanced logging
 */
export function bulkEnhancedKeywordExclusion(
  payeeNames: string[],
  customKeywords?: string[]
): KeywordExclusionResult[] {
  console.log(`[BULK ENHANCED EXCLUSION] Processing ${payeeNames.length} names`);
  
  const results = payeeNames.map((name, index) => {
    console.log(`[BULK ENHANCED EXCLUSION] Processing ${index + 1}/${payeeNames.length}: "${name}"`);
    return checkEnhancedKeywordExclusion(name, customKeywords);
  });

  const excludedCount = results.filter(r => r.isExcluded).length;
  console.log(`[BULK ENHANCED EXCLUSION] Complete: ${excludedCount}/${payeeNames.length} excluded`);
  
  // Log AT&T specific results
  const attResults = results.filter((_, i) => {
    const name = payeeNames[i].toUpperCase();
    return name.includes('AT') && (name.includes('&') || name.includes('T'));
  });
  
  if (attResults.length > 0) {
    console.log('[BULK ENHANCED EXCLUSION] [AT&T DEBUG] AT&T variant results:', 
      attResults.map((result, i) => ({
        name: payeeNames[results.indexOf(result)],
        excluded: result.isExcluded,
        matches: result.matchedKeywords
      }))
    );
  }

  return results;
}
