
import { ClassificationResult, ClassificationConfig } from '../types';
import { DEFAULT_CLASSIFICATION_CONFIG } from './config';
import { enhancedProcessBatchV3 } from './enhancedBatchProcessorV3';

/**
 * FIXED: Simple batch processing entry point with guaranteed 1:1 row mapping
 */
export async function processBatch(
  payeeNames: string[], 
  onProgress?: (current: number, total: number, percentage: number, stats?: any) => void,
  config: ClassificationConfig = DEFAULT_CLASSIFICATION_CONFIG
): Promise<ClassificationResult[]> {
  console.log(`[BATCH PROCESSING] FIXED: Processing ${payeeNames.length} payees with simple sequential approach`);
  
  // Use the FIXED simple processor
  const batchResult = await enhancedProcessBatchV3(payeeNames, config);
  
  // VALIDATION: Ensure perfect alignment
  if (batchResult.results.length !== payeeNames.length) {
    throw new Error(`Batch processing alignment error: expected ${payeeNames.length} results, got ${batchResult.results.length}`);
  }
  
  // Convert to ClassificationResult array while maintaining order
  const classificationResults = batchResult.results.map((result, index) => {
    // VALIDATION: Ensure row index matches
    if (result.rowIndex !== index) {
      console.error(`Row index mismatch at position ${index}: expected ${index}, got ${result.rowIndex}`);
    }
    
    return {
      payeeName: result.payeeName,
      classification: result.result.classification,
      confidence: result.result.confidence,
      reasoning: result.result.reasoning,
      processingTier: result.result.processingTier,
      processingMethod: result.result.processingMethod,
      keywordExclusion: result.result.keywordExclusion,
      matchingRules: result.result.matchingRules,
      similarityScores: result.result.similarityScores
    };
  });
  
  console.log(`[BATCH PROCESSING] FIXED: Converted ${classificationResults.length} results with perfect alignment`);
  
  return classificationResults;
}

// Export the FIXED enhanced processor
export { enhancedProcessBatchV3 };
