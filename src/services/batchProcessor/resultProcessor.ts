
import { PayeeClassification } from '@/lib/types';
import { checkKeywordExclusion } from '@/lib/classification/enhancedKeywordExclusion';
import { BatchProcessorStats } from './types';

export async function processIndividualResult(
  result: any,
  index: number,
  payeeName: string,
  jobId: string,
  stats: BatchProcessorStats
): Promise<PayeeClassification> {
  // Apply keyword exclusion check
  const keywordExclusion = await checkKeywordExclusion(payeeName);
  
  // Override classification if excluded
  let finalClassification = result.result?.classification || 'Individual';
  if (keywordExclusion.isExcluded) {
    finalClassification = 'Business';
    stats.excludedCount++;
  }
  
  if (finalClassification === 'Business') {
    stats.businessCount++;
  } else {
    stats.individualCount++;
  }
  
  if (result.result?.sicCode) {
    stats.sicCodeCount++;
  }

  const processedResult: PayeeClassification = {
    id: `${jobId}-${index}`,
    payeeName: payeeName,
    result: {
      classification: finalClassification,
      confidence: result.result?.confidence || 50,
      reasoning: result.result?.reasoning || 'No classification result',
      processingTier: result.result?.processingTier || 'Enhanced',
      processingMethod: result.result?.processingMethod || 'OpenAI',
      sicCode: result.result?.sicCode || '',
      sicDescription: result.result?.sicDescription || '',
      matchingRules: result.result?.matchingRules || [],
      keywordExclusion: keywordExclusion
    },
    timestamp: new Date(),
    originalData: result,
    rowIndex: index
  };

  return processedResult;
}
