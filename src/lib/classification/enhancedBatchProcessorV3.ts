
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
  let sicCodeCount = 0;

  // Process each payee
  for (let i = 0; i < payeeNames.length; i++) {
    const payeeName = payeeNames[i];
    const originalData = originalFileData?.[i] || null;
    
    try {
      console.log(`[ENHANCED BATCH V3] Processing payee ${i + 1}/${payeeNames.length}: ${payeeName}`);
      
      // Use the enhanced classification that includes SIC codes
      const classification = await enhancedClassifyPayeeWithAI(payeeName);
      
      // Debug SIC code extraction
      console.log(`[SIC DEBUG] Payee: "${payeeName}" | Classification: ${classification.classification} | SIC Code: ${classification.sicCode || 'None'} | SIC Description: ${classification.sicDescription || 'None'}`);
      
      // Apply keyword exclusion
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
      
      // Track SIC code assignment
      if (result.result.sicCode && result.result.classification === 'Business') {
        sicCodeCount++;
        console.log(`[SIC SUCCESS] Assigned SIC ${result.result.sicCode} to business "${payeeName}"`);
      } else if (result.result.classification === 'Business') {
        console.warn(`[SIC WARNING] Business "${payeeName}" missing SIC code`);
      }
      
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

  const businessCount = results.filter(r => r.result.classification === 'Business').length;
  
  console.log(`[ENHANCED BATCH V3] Batch processing complete: ${successCount} success, ${failureCount} failures`);
  console.log(`[SIC SUMMARY] SIC codes assigned: ${sicCodeCount} out of ${businessCount} businesses (${businessCount > 0 ? Math.round((sicCodeCount / businessCount) * 100) : 0}%)`);

  return batchResult;
}

// Export the function that was missing from other files
export { exportResultsWithOriginalDataV3 } from './batchExporter';
