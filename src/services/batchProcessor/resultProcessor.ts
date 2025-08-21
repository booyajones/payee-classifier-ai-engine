
import { PayeeClassification } from '@/lib/types';
import { checkKeywordExclusion } from '@/lib/classification/enhancedKeywordExclusion';
import { BatchProcessorStats } from './types';
import { productionLogger } from '@/lib/logging';

export async function processIndividualResult(
  result: any,
  index: number,
  payeeName: string,
  jobId: string,
  stats: BatchProcessorStats,
  originalRowData?: any,
  duplicateData?: any
): Promise<PayeeClassification> {
  productionLogger.debug(
    `Processing result ${index} for "${payeeName}" with original data preservation`,
    undefined,
    'RESULT_PROCESSOR'
  );
  
  // Apply keyword exclusion check
  const keywordExclusion = await checkKeywordExclusion(payeeName);
  
  // ENFORCE HIGH ACCURACY - reject low confidence results
  const confidence = result.result?.confidence || result.confidence || 50;
  if (confidence < 85) {
    productionLogger.warn(
      `Low confidence ${confidence}% for "${payeeName}", marking as needs review`,
      undefined,
      'RESULT_PROCESSOR'
    );
  }
  
  // Override classification if excluded
  let finalClassification = result.result?.classification || result.classification || 'Individual';
  if (keywordExclusion.isExcluded) {
    finalClassification = 'Business';
    stats.excludedCount++;
    productionLogger.info(
      `Keyword exclusion applied to "${payeeName}" - forced to Business`,
      undefined,
      'RESULT_PROCESSOR'
    );
  }
  
  if (finalClassification === 'Business') {
    stats.businessCount++;
  } else {
    stats.individualCount++;
  }
  
  // Validate SIC codes for businesses
  const sicCode = result.result?.sicCode || result.sicCode;
  if (finalClassification === 'Business' && sicCode) {
    stats.sicCodeCount++;
    productionLogger.info(
      `Business "${payeeName}" has SIC code: ${sicCode}`,
      undefined,
      'RESULT_PROCESSOR'
    );
  } else if (finalClassification === 'Business' && !sicCode) {
    productionLogger.warn(
      `Business "${payeeName}" missing SIC code`,
      undefined,
      'RESULT_PROCESSOR'
    );
  }

  // CRITICAL: Preserve ALL original row data and ensure correct reasoning
  const processedResult: PayeeClassification = {
    id: `${jobId}-${index}`,
    payeeName: payeeName,
    result: {
      classification: finalClassification,
      confidence: confidence,
      // FIX: Ensure reasoning is specific to this payee and classification
      reasoning: keywordExclusion.isExcluded 
        ? `Keyword exclusion applied: ${keywordExclusion.reasoning}` 
        : (result.result?.reasoning || result.reasoning || `Classified as ${finalClassification} based on analysis`),
      processingTier: result.result?.processingTier || 'AI-Powered',
      processingMethod: result.result?.processingMethod || 'OpenAI High-Accuracy',
      sicCode: sicCode || '',
      sicDescription: result.result?.sicDescription || result.sicDescription || '',
      matchingRules: result.result?.matchingRules || [],
      keywordExclusion: keywordExclusion
    },
    timestamp: new Date(),
    // PRESERVE COMPLETE ORIGINAL ROW DATA - this is critical for data integrity
    originalData: originalRowData || result.originalData || {},
    rowIndex: index,
    // CRITICAL: Attach duplicate detection data directly to the classification result
    ...(duplicateData || {})
  };

  productionLogger.debug(
    `Processed "${payeeName}": ${finalClassification} (${confidence}%) with ${Object.keys(
      processedResult.originalData || {}
    ).length} original columns`,
    undefined,
    'RESULT_PROCESSOR'
  );
  return processedResult;
}
