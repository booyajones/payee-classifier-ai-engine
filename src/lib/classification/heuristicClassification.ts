
import { ClassificationResult } from '../types';

/**
 * Heuristic classification fallback when all else fails
 */
export function performHeuristicClassification(
  payeeName: string, 
  businessIndicators: string[], 
  individualIndicators: string[],
  originalError: any
): ClassificationResult {
  const words = payeeName.split(/\s+/);
  
  // Simple heuristics
  const isLikelyBusiness = 
    businessIndicators.length > 0 ||
    words.length > 3 ||
    /\d/.test(payeeName) ||
    payeeName.length > 25 ||
    /[&@#$%]/.test(payeeName);
  
  const isLikelyIndividual = 
    individualIndicators.length > 0 ||
    (words.length === 2 && !/\d/.test(payeeName));
  
  let classification: 'Business' | 'Individual';
  let confidence: number;
  
  if (isLikelyBusiness && !isLikelyIndividual) {
    classification = 'Business';
    confidence = 60;
  } else if (isLikelyIndividual && !isLikelyBusiness) {
    classification = 'Individual';
    confidence = 60;
  } else {
    // Default to individual for ambiguous cases
    classification = 'Individual';
    confidence = 51;
  }
  
  return {
    classification,
    confidence,
    reasoning: `Fallback heuristic classification due to service errors (Original error: ${originalError?.message || 'Unknown'})`,
    processingTier: 'Rule-Based',
    processingMethod: 'Final heuristic fallback'
  };
}
