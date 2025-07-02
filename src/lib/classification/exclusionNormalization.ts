
import { advancedNormalization } from './stringMatching';

/**
 * Normalize a keyword for consistent matching with payee names
 */
export function normalizeKeywordForMatching(keyword: string): string {
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
export function checkTokenMatch(normalizedPayee: string, normalizedKeyword: string): boolean {
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
  
  // Only allow exact normalized string matches to prevent substring issues
  return normalizedPayee === normalizedKeyword;
}
