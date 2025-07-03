
import { ClassificationResult } from '../types';
import { calculateCombinedSimilarity } from './stringMatching';

/**
 * Perform fuzzy matching against cached results
 */
export async function performFuzzyMatching(payeeName: string, threshold: number): Promise<ClassificationResult | null> {
  try {
    // Get cached classifications from localStorage
    const cachedClassifications = JSON.parse(localStorage.getItem('payeeClassifications') || '{}');
    const cachedNames = Object.keys(cachedClassifications);
    
    if (cachedNames.length === 0) return null;
    
    // Find best matches using our string matching algorithms
    const similarities = cachedNames.map(cachedName => ({
      name: cachedName,
      scores: calculateCombinedSimilarity(payeeName, cachedName),
      result: cachedClassifications[cachedName]
    })).filter(match => match.scores.combined >= threshold);
    
    if (similarities.length === 0) return null;
    
    // Get the best match
    const bestMatch = similarities.sort((a, b) => b.scores.combined - a.scores.combined)[0];
    
    return {
      classification: bestMatch.result.result.classification,
      confidence: Math.min(bestMatch.scores.combined, 85), // Cap confidence for fuzzy matches
      reasoning: `Fuzzy match with "${bestMatch.name}" (${bestMatch.scores.combined.toFixed(1)}% similarity)`,
      processingTier: 'Rule-Based',
      similarityScores: bestMatch.scores,
      processingMethod: 'Fuzzy matching against cache'
    };
  } catch (error) {
    console.warn('Fuzzy matching failed:', error);
    return null;
  }
}
