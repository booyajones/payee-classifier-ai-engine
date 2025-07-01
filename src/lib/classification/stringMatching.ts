export interface SimilarityScores {
  levenshtein: number;
  jaro: number;
  jaroWinkler: number;
  dice: number;
  tokenSort: number;
  combined: number;
}

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Calculate Levenshtein similarity as a percentage
 */
export function levenshteinSimilarity(str1: string, str2: string): number {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 100;
  return ((maxLength - levenshteinDistance(str1, str2)) / maxLength) * 100;
}

/**
 * Calculate Jaro similarity between two strings
 */
function jaroSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  
  const len1 = str1.length;
  const len2 = str2.length;
  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
  
  if (matchWindow < 0) return 0;
  
  const str1Matches = new Array(len1).fill(false);
  const str2Matches = new Array(len2).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  // Find matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);
    
    for (let j = start; j < end; j++) {
      if (str2Matches[j] || str1[i] !== str2[j]) continue;
      str1Matches[i] = str2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0;
  
  // Find transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!str1Matches[i]) continue;
    while (!str2Matches[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }
  
  return (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
}

/**
 * Calculate Jaro-Winkler similarity between two strings
 */
export function jaroWinklerSimilarity(str1: string, str2: string): number {
  const jaro = jaroSimilarity(str1, str2);
  
  if (jaro < 0.7) return jaro;
  
  let prefix = 0;
  for (let i = 0; i < Math.min(str1.length, str2.length, 4); i++) {
    if (str1[i] === str2[i]) prefix++;
    else break;
  }
  
  return jaro + (0.1 * prefix * (1 - jaro));
}

/**
 * Calculate Dice coefficient between two strings
 */
export function diceCoefficient(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (str1.length < 2 || str2.length < 2) return 0;
  
  const bigrams1 = new Set<string>();
  const bigrams2 = new Set<string>();
  
  for (let i = 0; i < str1.length - 1; i++) {
    bigrams1.add(str1.substr(i, 2));
  }
  
  for (let i = 0; i < str2.length - 1; i++) {
    bigrams2.add(str2.substr(i, 2));
  }
  
  const intersection = new Set([...bigrams1].filter(x => bigrams2.has(x)));
  return (2.0 * intersection.size) / (bigrams1.size + bigrams2.size);
}

/**
 * Calculate Token Sort Ratio between two strings
 */
export function tokenSortRatio(str1: string, str2: string): number {
  const tokens1 = str1.toLowerCase().split(/\s+/).sort().join(' ');
  const tokens2 = str2.toLowerCase().split(/\s+/).sort().join(' ');
  
  return levenshteinSimilarity(tokens1, tokens2);
}

/**
 * Calculate combined similarity score between two strings
 */
export function calculateCombinedSimilarity(str1: string, str2: string): SimilarityScores {
  const maxLength = Math.max(str1.length, str2.length);
  const levenshtein = maxLength === 0 ? 100 : ((maxLength - levenshteinDistance(str1, str2)) / maxLength) * 100;
  const jaro = jaroSimilarity(str1, str2) * 100;
  const jaroWinkler = jaroWinklerSimilarity(str1, str2) * 100;
  const dice = diceCoefficient(str1, str2) * 100;
  const tokenSort = tokenSortRatio(str1, str2);
  const combined = (levenshtein * 0.3 + jaro * 0.2 + jaroWinkler * 0.2 + dice * 0.15 + tokenSort * 0.15);
  
  return {
    levenshtein,
    jaro,
    jaroWinkler,
    dice,
    tokenSort,
    combined
  };
}

/**
 * Advanced text normalization for better matching
 */
export function advancedNormalization(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .toUpperCase()
    .trim()
    // Handle common business abbreviations and symbols
    .replace(/\s*&\s*/g, ' AND ')  // Convert & to AND with proper spacing
    .replace(/\s*\+\s*/g, ' PLUS ') // Convert + to PLUS
    .replace(/\s*@\s*/g, ' AT ')    // Convert @ to AT
    .replace(/\s*#\s*/g, ' NUMBER ') // Convert # to NUMBER
    .replace(/\s*\*\s*/g, ' STAR ')  // Convert * to STAR
    // Normalize punctuation
    .replace(/[^\w\s]/g, ' ')       // Replace all non-word chars with space
    .replace(/\s+/g, ' ')           // Normalize multiple spaces to single space
    .trim();
}
