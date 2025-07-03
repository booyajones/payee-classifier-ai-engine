
import OpenAI from 'openai';
import { getOpenAIClient } from './client';
import { timeoutPromise } from './utils';
import { DEFAULT_API_TIMEOUT, CLASSIFICATION_MODEL } from './config';
import { classifyPayeeWithAI } from './singleClassification';

export interface EnhancedClassificationResult {
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
  processingTier?: string;
  processingMethod?: string;
  matchingRules?: string[];
  sicCode?: string;
  sicDescription?: string;
}

/**
 * Enhanced payee classification with SIC code integration
 */
export async function enhancedClassifyPayeeWithAI(
  payeeName: string,
  timeout: number = DEFAULT_API_TIMEOUT
): Promise<EnhancedClassificationResult> {
  productionLogger.debug(`[ENHANCED CLASSIFICATION] Classifying "${payeeName}" with SIC code support`);

  try {
    // Use the single classification function which already has SIC code logic
    const result = await classifyPayeeWithAI(payeeName, timeout);
    
    productionLogger.debug(`[ENHANCED CLASSIFICATION] Result for "${payeeName}":`, {
      classification: result.classification,
      confidence: result.confidence,
      sicCode: result.sicCode,
      sicDescription: result.sicDescription
    });

    return {
      classification: result.classification,
      confidence: result.confidence,
      reasoning: result.reasoning,
      processingTier: 'AI-Powered',
      processingMethod: 'Enhanced OpenAI Classification with SIC Codes',
      matchingRules: ['OpenAI Enhanced Classification'],
      sicCode: result.sicCode,
      sicDescription: result.sicDescription
    };
  } catch (error) {
    productionLogger.error(`[ENHANCED CLASSIFICATION] Error classifying "${payeeName}":`, error);
    throw error;
  }
}

/**
 * Consensus classification - fallback method
 */
export async function consensusClassification(
  payeeName: string,
  timeout: number = DEFAULT_API_TIMEOUT
): Promise<EnhancedClassificationResult> {
  productionLogger.debug(`[CONSENSUS CLASSIFICATION] Using enhanced classification for "${payeeName}"`);
  return await enhancedClassifyPayeeWithAI(payeeName, timeout);
}
