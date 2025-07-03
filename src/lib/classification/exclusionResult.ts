
import { type SimilarityScores } from './stringMatching';

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
 * Build the final exclusion result based on matched keywords and confidence scores
 */
export function buildExclusionResult(
  payeeName: string,
  normalizedPayee: string,
  matchedKeywords: string[],
  highestConfidence: number,
  bestReasoning: string,
  keywords: string[],
  normalizedKeywords: string[]
): KeywordExclusionResult {
  const isExcluded = matchedKeywords.length > 0;
  const finalConfidence = isExcluded ? highestConfidence : 0;
  
  return {
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
}

/**
 * Log AT&T specific debugging information
 */
export function logATTDebugging(payeeName: string, result: KeywordExclusionResult): void {
  if (payeeName.toUpperCase().includes('AT') && (payeeName.includes('&') || payeeName.includes('T'))) {
    console.log(`[ENHANCED EXCLUSION] [AT&T DEBUG] Final result for "${payeeName}":`, {
      isExcluded: result.isExcluded,
      matchedKeywords: result.matchedKeywords,
      confidence: result.confidence
    });
  }
}

/**
 * Log general exclusion results
 */
export function logExclusionResult(payeeName: string, result: KeywordExclusionResult): void {
  console.log(`[ENHANCED EXCLUSION] Result for "${payeeName}": ${result.isExcluded ? 'EXCLUDED' : 'NOT EXCLUDED'} (${result.confidence}% confidence)`);
  if (result.isExcluded) {
    console.log(`[ENHANCED EXCLUSION] Matched: ${result.matchedKeywords.join(', ')}`);
  }
}
