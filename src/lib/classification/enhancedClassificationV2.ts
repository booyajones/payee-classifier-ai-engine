
import { ClassificationResult, ClassificationConfig } from '../types';
import { DEFAULT_CLASSIFICATION_CONFIG } from './config';
import { checkEnhancedKeywordExclusion as checkKeywordExclusion } from './enhancedExclusionLogic';
import { advancedNormalization } from './stringMatching';
import { applyRuleBasedClassification } from './ruleBasedClassification';
import { applyNLPClassification } from './nlpClassification';
import { consensusClassification } from '../openai/enhancedClassification';
import { detectBusinessByExtendedRules, detectIndividualByExtendedRules } from './enhancedRules';
import { performFuzzyMatching } from './fuzzyMatching';
import { performOfflineClassification } from './offlineClassification';
import { performHeuristicClassification } from './heuristicClassification';

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
