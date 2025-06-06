
import { ClassificationResult, ClassificationConfig } from '../types';
import { DEFAULT_CLASSIFICATION_CONFIG } from './config';
import { enhancedProcessBatchV3 } from './enhancedBatchProcessorV3';

/**
 * FIXED: Process a batch of payee names using the enhanced processing system with data integrity
 * This is the main entry point for batch processing with all optimizations and fixes
 */
export async function processBatch(
  payeeNames: string[], 
  onProgress?: (current: number, total: number, percentage: number, stats?: any) => void,
  config: ClassificationConfig = DEFAULT_CLASSIFICATION_CONFIG
): Promise<ClassificationResult[]> {
  // Use the FIXED enhanced V3 processor for optimal performance and data integrity
  const batchResult = await enhancedProcessBatchV3(payeeNames, config);
  
  // Convert BatchProcessingResult to ClassificationResult array for compatibility
  return batchResult.results.map(result => ({
    payeeName: result.payeeName,
    classification: result.result.classification,
    confidence: result.result.confidence,
    reasoning: result.result.reasoning,
    processingTier: result.result.processingTier,
    processingMethod: result.result.processingMethod,
    keywordExclusion: result.result.keywordExclusion,
    matchingRules: result.result.matchingRules,
    similarityScores: result.result.similarityScores
  }));
}

// Export the FIXED enhanced processor for direct use if needed
export { enhancedProcessBatchV3 };
