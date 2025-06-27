
import { PayeeClassification, BatchProcessingResult, ClassificationConfig } from '../types';
import { enhancedClassifyPayeeWithAI } from '../openai/enhancedClassification';
import { classifyPayeeWithAI } from '../openai/singleClassification';
import { checkKeywordExclusion } from './enhancedKeywordExclusion';
import { saveClassificationResults } from '../database/classificationService';

/**
 * Enhanced batch processor V3 with improved SIC code handling and database persistence
 */
export async function enhancedProcessBatchV3(
  payeeNames: string[],
  config: ClassificationConfig,
  originalFileData?: any[]
): Promise<BatchProcessingResult> {
  console.log(`[ENHANCED BATCH V3] Starting batch processing of ${payeeNames.length} payees with SIC codes`);
  
  const results: PayeeClassification[] = [];
  const errors: string[] = [];
  let successCount = 0;
  let failureCount = 0;

  // Process each payee
  for (let i = 0; i < payeeNames.length; i++) {
    const payeeName = payeeNames[i];
    const originalData = originalFileData?.[i] || null;
    
    try {
      console.log(`[ENHANCED BATCH V3] Processing payee ${i + 1}/${payeeNames.length}: ${payeeName}`);
      
      // Use the enhanced classification that includes SIC codes
      const classification = await enhancedClassifyPayeeWithAI(payeeName);
      
      // Apply keyword exclusion - use the correct function name
      const keywordResult = await checkKeywordExclusion(payeeName);
      
      const result: PayeeClassification = {
        id: `${Date.now()}-${i}`,
        payeeName,
        result: {
          classification: classification.classification,
          confidence: classification.confidence,
          reasoning: classification.reasoning,
          processingTier: 'AI-Powered',
          processingMethod: 'Enhanced OpenAI Classification',
          matchingRules: classification.matchingRules,
          sicCode: classification.sicCode,
          sicDescription: classification.sicDescription,
          keywordExclusion: keywordResult
        },
        timestamp: new Date(),
        originalData,
        rowIndex: i
      };
      
      results.push(result);
      successCount++;
      
      console.log(`[ENHANCED BATCH V3] Successfully classified "${payeeName}" as ${classification.classification} with SIC: ${classification.sicCode || 'N/A'}`);
    } catch (error) {
      console.error(`[ENHANCED BATCH V3] Error processing ${payeeName}:`, error);
      errors.push(`${payeeName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failureCount++;
    }
  }

  // Create batch result
  const batchResult: BatchProcessingResult = {
    results,
    successCount,
    failureCount,
    originalFileData: originalFileData || []
  };

  // CRITICAL: Save all results to database immediately after processing
  try {
    console.log(`[ENHANCED BATCH V3] Saving ${results.length} classification results to database with SIC codes`);
    await saveClassificationResults(results);
    console.log(`[ENHANCED BATCH V3] Successfully saved all results to database`);
  } catch (error) {
    console.error(`[ENHANCED BATCH V3] ERROR: Failed to save results to database:`, error);
    // Don't throw here - we still want to return the results even if database save fails
  }

  console.log(`[ENHANCED BATCH V3] Batch processing complete: ${successCount} success, ${failureCount} failures`);
  console.log(`[ENHANCED BATCH V3] SIC codes assigned: ${results.filter(r => r.result.sicCode).length} out of ${results.filter(r => r.result.classification === 'Business').length} businesses`);

  return batchResult;
}

// Export the function that was missing from other files
export { exportResultsWithOriginalDataV3 } from './batchExporter';
