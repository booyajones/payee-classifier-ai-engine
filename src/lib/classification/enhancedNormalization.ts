import { advancedNormalization } from './stringMatching';

/**
 * Enhanced normalization specifically for duplicate detection
 * Handles business suffixes and common variations better
 */
export function normalizeForDuplicateDetection(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  let normalized = advancedNormalization(text);
  
  // Enhanced normalization for better duplicate detection
  normalized = normalized
    .replace(/\b(INCORPORATED)\b/g, 'INC')  // Standardize to short form
    .replace(/\b(CORPORATION)\b/g, 'CORP')
    .replace(/\b(LIMITED)\b/g, 'LTD') 
    .replace(/\b(COMPANY)\b/g, 'CO')
    .replace(/\s+/g, ' ')
    .trim();
  
  productionLogger.debug(`[ENHANCED NORMALIZATION] "${text}" → "${normalized}"`);
  
  return normalized;
}

/**
 * Check if two names represent the same entity considering business variations
 */
export function isSameEntity(name1: string, name2: string): boolean {
  const norm1 = normalizeForDuplicateDetection(name1);
  const norm2 = normalizeForDuplicateDetection(name2);
  
  productionLogger.debug(`[SAME ENTITY CHECK] "${name1}" -> "${norm1}" vs "${name2}" -> "${norm2}"`);
  
  // Direct match after normalization
  if (norm1 === norm2) {
    productionLogger.debug(`[SAME ENTITY CHECK] ✅ EXACT MATCH after normalization`);
    return true;
  }
  
  // Check if one is a subset of the other (partial name matching)
  const tokens1 = norm1.split(/\s+/).filter(t => t.length > 0);
  const tokens2 = norm2.split(/\s+/).filter(t => t.length > 0);
  
  // Enhanced token matching - check for core name similarity
  if (tokens1.length > 0 && tokens2.length > 0) {
    // Get core tokens (remove business suffixes for comparison)
    const coreTokens1 = tokens1.filter(t => !['INC', 'CORP', 'LLC', 'LTD', 'CO'].includes(t));
    const coreTokens2 = tokens2.filter(t => !['INC', 'CORP', 'LLC', 'LTD', 'CO'].includes(t));
    
    // If core names match exactly, it's the same entity
    if (coreTokens1.length > 0 && coreTokens2.length > 0) {
      const coreMatch = coreTokens1.join(' ') === coreTokens2.join(' ');
      if (coreMatch) {
        productionLogger.debug(`[SAME ENTITY CHECK] ✅ CORE TOKENS MATCH: "${coreTokens1.join(' ')}" = "${coreTokens2.join(' ')}"`);
        return true;
      }
    }
  }
  
  // If one name has all tokens of the shorter name, they're likely the same entity
  if (tokens1.length !== tokens2.length) {
    const [shorter, longer] = tokens1.length < tokens2.length ? [tokens1, tokens2] : [tokens2, tokens1];
    const hasAllTokens = shorter.every(token => longer.includes(token));
    if (hasAllTokens && shorter.length > 0) {
      productionLogger.debug(`[SAME ENTITY CHECK] ✅ SUBSET MATCH: shorter "${shorter.join(' ')}" found in longer "${longer.join(' ')}"`);
      return true;
    }
  }
  
  productionLogger.debug(`[SAME ENTITY CHECK] ❌ NO MATCH FOUND`);
  return false;
}
