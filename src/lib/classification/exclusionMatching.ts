
import { calculateCombinedSimilarity } from './stringMatching';
import { isWholeWordMatch } from './patternMatching';
import { checkTokenMatch } from './exclusionNormalization';

export interface MatchResult {
  isMatch: boolean;
  confidence: number;
  matchReason: string;
}

/**
 * Apply different matching strategies to determine if a payee name matches a keyword
 */
export function applyMatchingStrategies(
  normalizedPayee: string,
  normalizedKeyword: string
): MatchResult {
  // Method 1: Exact normalized match
  if (normalizedPayee === normalizedKeyword) {
    return {
      isMatch: true,
      confidence: 100,
      matchReason: 'Exact normalized match'
    };
  }
  
  // Method 2: Token-based matching for compound names
  if (checkTokenMatch(normalizedPayee, normalizedKeyword)) {
    return {
      isMatch: true,
      confidence: 95,
      matchReason: 'Token-based match'
    };
  }
  
  // Method 3: Whole word matching with regex
  if (isWholeWordMatch(normalizedPayee, normalizedKeyword)) {
    return {
      isMatch: true,
      confidence: 90,
      matchReason: 'Whole word match'
    };
  }
  
  // Method 4: Simple contains check
  if (normalizedPayee.includes(normalizedKeyword) || normalizedKeyword.includes(normalizedPayee)) {
    return {
      isMatch: true,
      confidence: 80,
      matchReason: 'Contains match'
    };
  }
  
  // Method 5: Similarity scoring for fuzzy matches
  const similarity = calculateCombinedSimilarity(normalizedPayee, normalizedKeyword);
  if (similarity.combined > 85) {
    return {
      isMatch: true,
      confidence: similarity.combined,
      matchReason: `Similarity match (${similarity.combined.toFixed(1)}%)`
    };
  }
  
  return {
    isMatch: false,
    confidence: 0,
    matchReason: 'No match found'
  };
}
