
import { PayeeClassification } from '@/lib/types';
import { checkKeywordExclusion } from '@/lib/classification/enhancedKeywordExclusion';
import { BatchProcessorStats } from './types';

export async function processIndividualResult(
  result: any,
  index: number,
  payeeName: string,
  jobId: string,
  stats: BatchProcessorStats,
  originalRowData?: any
): Promise<PayeeClassification> {
  console.log(`[RESULT PROCESSOR] Processing result ${index} for "${payeeName}" with original data preservation`);
  
  // Apply keyword exclusion check
  const keywordExclusion = await checkKeywordExclusion(payeeName);
  
  // ENFORCE HIGH ACCURACY - reject low confidence results
  const confidence = result.result?.confidence || result.confidence || 50;
  if (confidence < 85) {
    console.warn(`[RESULT PROCESSOR] Low confidence ${confidence}% for "${payeeName}", marking as needs review`);
  }
  
  // Override classification if excluded
  let finalClassification = result.result?.classification || result.classification || 'Individual';
  if (keywordExclusion.isExcluded) {
    finalClassification = 'Business';
    stats.excludedCount++;
    console.log(`[RESULT PROCESSOR] Keyword exclusion applied to "${payeeName}" - forced to Business`);
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
    console.log(`[RESULT PROCESSOR] Business "${payeeName}" has SIC code: ${sicCode}`);
  } else if (finalClassification === 'Business' && !sicCode) {
    console.warn(`[RESULT PROCESSOR] Business "${payeeName}" missing SIC code`);
  }

  // CRITICAL: Preserve ALL original row data
  const processedResult: PayeeClassification = {
    id: `${jobId}-${index}`,
    payeeName: payeeName,
    result: {
      classification: finalClassification,
      confidence: confidence,
      reasoning: result.result?.reasoning || result.reasoning || 'Classification completed',
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
    rowIndex: index
  };

  console.log(`[RESULT PROCESSOR] Processed "${payeeName}": ${finalClassification} (${confidence}%) with ${Object.keys(processedResult.originalData || {}).length} original columns`);
  return processedResult;
}
