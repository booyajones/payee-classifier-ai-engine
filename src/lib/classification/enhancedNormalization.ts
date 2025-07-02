import { advancedNormalization } from './stringMatching';

/**
 * Enhanced normalization specifically for duplicate detection
 * Handles business suffixes and common variations better
 */
export function normalizeForDuplicateDetection(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  let normalized = advancedNormalization(text);
  
  // Normalize common business suffixes to catch duplicates
  normalized = normalized
    .replace(/\b(INCORPORATED|INC|CORP|CORPORATION|LLC|LTD|LIMITED|CO|COMPANY)\b/g, 'BUSINESS')
    .replace(/\b(ENTERPRISES|ENTERPRISE|GROUP|PARTNERS|PARTNERSHIP)\b/g, 'BUSINESS')
    .replace(/\s+BUSINESS\s*$/g, '') // Remove trailing business indicator
    .replace(/\s+/g, ' ')
    .trim();
  
  return normalized;
}

/**
 * Check if two names represent the same entity considering business variations
 */
export function isSameEntity(name1: string, name2: string): boolean {
  const norm1 = normalizeForDuplicateDetection(name1);
  const norm2 = normalizeForDuplicateDetection(name2);
  
  // Direct match after normalization
  if (norm1 === norm2) return true;
  
  // Check if one is a subset of the other (partial name matching)
  const tokens1 = norm1.split(/\s+/).filter(t => t.length > 0);
  const tokens2 = norm2.split(/\s+/).filter(t => t.length > 0);
  
  // If one name has all tokens of the shorter name, they're likely the same entity
  if (tokens1.length !== tokens2.length) {
    const [shorter, longer] = tokens1.length < tokens2.length ? [tokens1, tokens2] : [tokens2, tokens1];
    const hasAllTokens = shorter.every(token => longer.includes(token));
    if (hasAllTokens && shorter.length > 0) return true;
  }
  
  return false;
}