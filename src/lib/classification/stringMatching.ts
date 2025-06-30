
export interface SimilarityScores {
  levenshtein: number;
  jaro: number;
  jaroWinkler: number;
  combined: number;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
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
function jaroWinklerSimilarity(str1: string, str2: string): number {
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
 * Calculate combined similarity score between two strings
 */
export function calculateCombinedSimilarity(str1: string, str2: string): SimilarityScores {
  const maxLength = Math.max(str1.length, str2.length);
  const levenshtein = maxLength === 0 ? 100 : ((maxLength - levenshteinDistance(str1, str2)) / maxLength) * 100;
  const jaro = jaroSimilarity(str1, str2) * 100;
  const jaroWinkler = jaroWinklerSimilarity(str1, str2) * 100;
  const combined = (levenshtein * 0.4 + jaro * 0.3 + jaroWinkler * 0.3);
  
  return {
    levenshtein,
    jaro,
    jaroWinkler,
    combined
  };
}

/**
 * Advanced text normalization for better matching
 */
export function advancedNormalization(text: string): { normalized: string; tokens: string[] } {
  const normalized = text
    .toUpperCase()
    .trim()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');
  
  const tokens = normalized
    .split(' ')
    .filter(token => token.length > 0);
  
  return { normalized, tokens };
}
