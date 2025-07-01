
import { ClassificationResult, ClassificationConfig, SimilarityScores } from '../types';
import { DEFAULT_CLASSIFICATION_CONFIG } from './config';
import { checkEnhancedKeywordExclusion as checkKeywordExclusion } from './enhancedExclusionLogic';
import { calculateCombinedSimilarity, advancedNormalization, levenshteinSimilarity } from './stringMatching';
import { applyRuleBasedClassification } from './ruleBasedClassification';
import { applyNLPClassification } from './nlpClassification';
import { consensusClassification } from '../openai/enhancedClassification';
import { detectBusinessByExtendedRules, detectIndividualByExtendedRules } from './enhancedRules';

const CONFIDENCE_THRESHOLDS = {
  HIGH_CONFIDENCE: 95,
  MEDIUM_CONFIDENCE: 85,
  REVIEW_REQUIRED: 75,
  ESCALATE_TO_AI: 65,
  FORCE_WEB_SEARCH: 50
};

/**
 * FIXED: Enhanced V3 classification that properly catches obvious business cases
 */
export async function enhancedClassifyPayeeV3(
  payeeName: string,
  config: ClassificationConfig = DEFAULT_CLASSIFICATION_CONFIG,
  retryCount: number = 0
): Promise<ClassificationResult> {
  if (!payeeName || payeeName.trim() === '') {
    return {
      classification: 'Individual',
      confidence: CONFIDENCE_THRESHOLDS.FORCE_WEB_SEARCH,
      reasoning: "Invalid or empty payee name - defaulting to Individual with minimum confidence",
      processingTier: 'Rule-Based',
      processingMethod: 'Input validation fallback'
    };
  }

  try {
    console.log(`[V3 FIXED] Classifying "${payeeName}" with enhanced business detection...`);

    // Stage 1: Keyword exclusion check
    const keywordExclusion = await checkKeywordExclusion(payeeName);
    if (keywordExclusion.isExcluded) {
      return {
        classification: 'Business',
        confidence: Math.max(keywordExclusion.confidence, CONFIDENCE_THRESHOLDS.MEDIUM_CONFIDENCE),
        reasoning: keywordExclusion.reasoning,
        processingTier: 'Excluded',
        keywordExclusion,
        processingMethod: 'Keyword exclusion'
      };
    }

    // Stage 2: FIXED Rule-based detection (should catch most obvious cases now)
    const ruleBasedResult = applyRuleBasedClassification(payeeName);
    if (ruleBasedResult && ruleBasedResult.confidence >= CONFIDENCE_THRESHOLDS.REVIEW_REQUIRED) {
      console.log(`[V3 FIXED] Rule-based classification successful for "${payeeName}": ${ruleBasedResult.classification} (${ruleBasedResult.confidence}%)`);
      return {
        ...ruleBasedResult,
        keywordExclusion,
        processingMethod: 'Enhanced rule-based classification'
      };
    }

    // Stage 3: Extended business/individual rules as backup
    const businessCheck = detectBusinessByExtendedRules(payeeName);
    if (businessCheck.isMatch) {
      const confidence = Math.min(CONFIDENCE_THRESHOLDS.HIGH_CONFIDENCE, 
        CONFIDENCE_THRESHOLDS.MEDIUM_CONFIDENCE + businessCheck.rules.length * 3);
      
      return {
        classification: 'Business',
        confidence,
        reasoning: `Extended business detection: ${businessCheck.rules.join(", ")}`,
        processingTier: 'Rule-Based',
        matchingRules: businessCheck.rules,
        keywordExclusion,
        processingMethod: 'Extended business rules'
      };
    }

    const individualCheck = detectIndividualByExtendedRules(payeeName);
    if (individualCheck.isMatch) {
      const confidence = Math.min(CONFIDENCE_THRESHOLDS.HIGH_CONFIDENCE, 
        CONFIDENCE_THRESHOLDS.MEDIUM_CONFIDENCE + individualCheck.rules.length * 4);
      
      return {
        classification: 'Individual',
        confidence,
        reasoning: `Extended individual detection: ${individualCheck.rules.join(", ")}`,
        processingTier: 'Rule-Based',
        matchingRules: individualCheck.rules,
        keywordExclusion,
        processingMethod: 'Extended individual rules'
      };
    }

    // Stage 4: NLP classification
    const nlpResult = applyNLPClassification(payeeName);
    if (nlpResult && nlpResult.confidence >= CONFIDENCE_THRESHOLDS.REVIEW_REQUIRED) {
      console.log(`[V3 FIXED] NLP classification successful for "${payeeName}": ${nlpResult.classification} (${nlpResult.confidence}%)`);
      return {
        ...nlpResult,
        keywordExclusion,
        processingMethod: 'NLP-based classification'
      };
    }

    // Stage 5: AI classification as final resort
    if (!config.offlineMode) {
      try {
        console.log(`[V3 FIXED] Using AI classification for "${payeeName}"`);
        const aiResult = await consensusClassification(payeeName, 2);
        
        return {
          classification: aiResult.classification,
          confidence: Math.max(aiResult.confidence, CONFIDENCE_THRESHOLDS.REVIEW_REQUIRED),
          reasoning: `AI classification: ${aiResult.reasoning}`,
          processingTier: 'AI-Powered',
          matchingRules: aiResult.matchingRules,
          keywordExclusion,
          processingMethod: 'AI consensus classification'
        };
        
      } catch (error) {
        console.warn(`[V3 FIXED] AI classification failed for "${payeeName}":`, error);
      }
    }

    // ABSOLUTE FALLBACK - analyze the name and make a determination
    const name = payeeName.toUpperCase();
    const words = name.split(/\s+/);
    
    // Final heuristic - if it looks like a business, classify as business
    const businessIndicators = [
      name.length > 15,
      words.length > 3,
      /[&@#$%]/.test(name),
      name === name.toUpperCase() && name.length > 8,
      !/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(payeeName)
    ];
    
    const businessScore = businessIndicators.filter(Boolean).length;
    
    if (businessScore >= 2) {
      return {
        classification: 'Business',
        confidence: CONFIDENCE_THRESHOLDS.REVIEW_REQUIRED,
        reasoning: `Fallback heuristic classification as business (${businessScore}/5 business indicators)`,
        processingTier: 'Rule-Based',
        keywordExclusion,
        processingMethod: 'Fallback heuristic analysis'
      };
    } else {
      return {
        classification: 'Individual',
        confidence: CONFIDENCE_THRESHOLDS.REVIEW_REQUIRED,
        reasoning: `Fallback heuristic classification as individual (${businessScore}/5 business indicators)`,
        processingTier: 'Rule-Based',
        keywordExclusion,
        processingMethod: 'Fallback heuristic analysis'
      };
    }

  } catch (error) {
    console.error(`[V3 FIXED] Critical error classifying "${payeeName}":`, error);
    
    // Emergency fallback
    return {
      classification: 'Individual',
      confidence: CONFIDENCE_THRESHOLDS.FORCE_WEB_SEARCH,
      reasoning: `Emergency fallback due to classification error: ${error.message}`,
      processingTier: 'Rule-Based',
      keywordExclusion: {
        isExcluded: false,
        matchedKeywords: [],
        confidence: 0,
        reasoning: 'Emergency fallback - no keyword exclusion applied'
      },
      processingMethod: 'Emergency fallback'
    };
  }
}
