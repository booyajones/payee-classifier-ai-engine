import { ClassificationResult, ClassificationConfig, SimilarityScores } from '../types';
import { DEFAULT_CLASSIFICATION_CONFIG } from './config';
import { checkEnhancedKeywordExclusion as checkKeywordExclusion } from './enhancedExclusionLogic';
import { calculateCombinedSimilarity, advancedNormalization } from './stringMatching';
import { applyRuleBasedClassification } from './ruleBasedClassification';
import { applyNLPClassification } from './nlpClassification';
import { consensusClassification } from '../openai/enhancedClassification';
import { detectBusinessByExtendedRules, detectIndividualByExtendedRules } from './enhancedRules';

/**
 * Enhanced classification with advanced string matching and comprehensive error handling
 */
export async function enhancedClassifyPayeeV2(
  payeeName: string,
  config: ClassificationConfig = DEFAULT_CLASSIFICATION_CONFIG,
  retryCount: number = 0
): Promise<ClassificationResult> {
  if (!payeeName || payeeName.trim() === '') {
    return {
      classification: 'Individual',
      confidence: 0,
      reasoning: "Invalid or empty payee name",
      processingTier: 'Failed',
      processingMethod: 'Input validation'
    };
  }

  try {
    // Step 1: Check keyword exclusion first
    const keywordExclusion = await checkKeywordExclusion(payeeName);
    if (keywordExclusion.isExcluded) {
      return {
        classification: 'Business', // Default for excluded items
        confidence: keywordExclusion.confidence,
        reasoning: keywordExclusion.reasoning,
        processingTier: 'Excluded',
        keywordExclusion,
        processingMethod: 'Keyword exclusion'
      };
    }

    // Step 2: Normalize the payee name for analysis
    const normalized = advancedNormalization(payeeName);
    
    // Simple business/individual indicators based on normalized text
    const businessIndicators: string[] = [];
    const individualIndicators: string[] = [];
    
    // Check for business indicators
    if (normalized.includes('CORP') || normalized.includes('INC') || normalized.includes('LLC')) {
      businessIndicators.push('Corporate suffix');
    }
    if (normalized.includes('AND') || normalized.includes('&')) {
      businessIndicators.push('Conjunction');
    }
    if (/\d/.test(normalized)) {
      businessIndicators.push('Contains numbers');
    }
    
    // Check for individual indicators
    const words = normalized.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 2 && !businessIndicators.length) {
      individualIndicators.push('Two word name');
    }
    
    // Step 3: Ultra-fast rule gate with enhanced detection
    const businessCheck = detectBusinessByExtendedRules(payeeName);
    if (businessCheck.isMatch) {
      return {
        classification: 'Business',
        confidence: Math.min(99, 85 + businessIndicators.length * 3),
        reasoning: `Strong business indicators detected: ${businessCheck.rules.join(", ")}`,
        processingTier: 'Rule-Based',
        matchingRules: businessCheck.rules,
        processingMethod: 'Extended business rules'
      };
    }

    const individualCheck = detectIndividualByExtendedRules(payeeName);
    if (individualCheck.isMatch) {
      return {
        classification: 'Individual',
        confidence: Math.min(97, 80 + individualIndicators.length * 4),
        reasoning: `Strong individual indicators detected: ${individualCheck.rules.join(", ")}`,
        processingTier: 'Rule-Based',
        matchingRules: individualCheck.rules,
        processingMethod: 'Extended individual rules'
      };
    }

    // Step 4: Fuzzy matching against known patterns (if enabled)
    if (config.useFuzzyMatching) {
      const fuzzyResult = await performFuzzyMatching(payeeName, config.similarityThreshold || 80);
      if (fuzzyResult) {
        return fuzzyResult;
      }
    }

    // Step 5: Offline mode fallback
    if (config.offlineMode) {
      const offlineResult = performOfflineClassification(payeeName, businessIndicators, individualIndicators);
      return offlineResult;
    }

    // Step 6: Bypass rule/NLP and go straight to AI
    if (config.bypassRuleNLP) {
      try {
        const aiResult = await consensusClassification(payeeName, 2);
        return {
          classification: aiResult.classification,
          confidence: aiResult.confidence,
          reasoning: aiResult.reasoning,
          processingTier: 'AI-Assisted',
          matchingRules: aiResult.matchingRules,
          processingMethod: 'Consensus AI classification'
        };
      } catch (error) {
        console.error("Error with AI classification:", error);
        // Fall through to rule-based backup
      }
    }

    // Step 7: Standard tiered approach
    // Tier 1: Rule-based classification
    const ruleBasedResult = applyRuleBasedClassification(payeeName);
    if (ruleBasedResult && ruleBasedResult.confidence >= config.aiThreshold) {
      return {
        ...ruleBasedResult,
        processingMethod: 'Standard rule-based classification'
      };
    }

    // Tier 2: NLP-based classification
    const nlpResult = applyNLPClassification(payeeName);
    if (nlpResult && nlpResult.confidence >= config.aiThreshold) {
      return {
        ...nlpResult,
        processingMethod: 'NLP-based classification'
      };
    }

    // Tier 3: AI-assisted classification with retry logic
    try {
      const aiResult = await consensusClassification(payeeName, 2);
      return {
        classification: aiResult.classification,
        confidence: aiResult.confidence,
        reasoning: aiResult.reasoning,
        processingTier: 'AI-Assisted',
        matchingRules: aiResult.matchingRules,
        processingMethod: 'AI consensus classification'
      };
    } catch (error) {
      console.error("Error with consensus classification:", error);
      
      // Retry logic for failed classifications
      if (config.retryFailedClassifications && retryCount < (config.maxRetries || 2)) {
        console.log(`Retrying classification for "${payeeName}" (attempt ${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return enhancedClassifyPayeeV2(payeeName, config, retryCount + 1);
      }

      // Final fallback with detailed heuristics
      return performHeuristicClassification(payeeName, businessIndicators, individualIndicators, error);
    }

  } catch (error) {
    console.error(`Unexpected error classifying "${payeeName}":`, error);
    
    // Return a failed classification with error details
    return {
      classification: 'Individual', // Default to individual on error
      confidence: 25,
      reasoning: `Classification failed due to unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      processingTier: 'Failed',
      processingMethod: 'Error fallback'
    };
  }
}

/**
 * Perform fuzzy matching against cached results
 */
async function performFuzzyMatching(payeeName: string, threshold: number): Promise<ClassificationResult | null> {
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

/**
 * Offline classification using advanced heuristics
 */
function performOfflineClassification(
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

/**
 * Heuristic classification fallback when all else fails
 */
function performHeuristicClassification(
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
