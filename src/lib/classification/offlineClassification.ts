
import { ClassificationResult } from '../types';

/**
 * Offline classification using advanced heuristics
 */
export function performOfflineClassification(
  payeeName: string, 
  businessIndicators: string[], 
  individualIndicators: string[]
): ClassificationResult {
  const words = payeeName.split(/\s+/);
  const hasNumbers = /\d/.test(payeeName);
  const hasSpecialChars = /[&@#$%]/.test(payeeName);
  const isAllCaps = payeeName === payeeName.toUpperCase() && payeeName.length > 5;
  
  let businessScore = 0;
  let individualScore = 0;
  
  // Scoring logic
  businessScore += businessIndicators.length * 20;
  businessScore += words.length > 3 ? 15 : 0;
  businessScore += hasNumbers ? 10 : 0;
  businessScore += hasSpecialChars ? 15 : 0;
  businessScore += isAllCaps ? 10 : 0;
  businessScore += payeeName.length > 25 ? 10 : 0;
  
  individualScore += individualIndicators.length * 25;
  individualScore += words.length === 2 ? 20 : 0;
  individualScore += words.length === 3 ? 15 : 0;
  individualScore += !hasNumbers ? 10 : 0;
  individualScore += !isAllCaps ? 5 : 0;
  
  const classification = businessScore > individualScore ? 'Business' : 'Individual';
  const confidence = Math.min(85, Math.max(businessScore, individualScore));
  
  return {
    classification,
    confidence,
    reasoning: `Offline heuristic classification (Business: ${businessScore}, Individual: ${individualScore})`,
    processingTier: 'Rule-Based',
    processingMethod: 'Offline heuristic analysis'
  };
}
