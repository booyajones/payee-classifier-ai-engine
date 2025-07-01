
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { checkKeywordExclusion } from '@/lib/classification/enhancedKeywordExclusion';
import { processInChunks } from '@/lib/performance/chunkProcessor';

/**
 * Enhanced batch result processor with chunked processing and keyword exclusion
 * This is the new async version that replaces the old processBatchResults
 */
export async function processEnhancedBatchResults(
  rawResults: any[],
  uniquePayeeNames: string[],
  payeeData: any,
  job: any,
  onProgress?: (processed: number, total: number, percentage: number) => void
): Promise<{ finalClassifications: PayeeClassification[]; summary: BatchProcessingResult }> {
  console.log(`[ENHANCED BATCH PROCESSOR] Processing ${rawResults.length} results with chunked keyword exclusion`);

  const processedResults: PayeeClassification[] = [];
  let businessCount = 0;
  let individualCount = 0;
  let excludedCount = 0;
  let sicCodeCount = 0;

  // Process results in chunks to prevent browser blocking
  const { results } = await processInChunks(
    rawResults,
    async (result, index) => {
      const payeeName = uniquePayeeNames[index] || `Unknown_${index}`;
      
      // Apply keyword exclusion check
      const keywordExclusion = await checkKeywordExclusion(payeeName);
      
      // Override classification if excluded
      let finalClassification = result.result?.classification || 'Individual';
      if (keywordExclusion.isExcluded) {
        finalClassification = 'Business';
        excludedCount++;
      }
      
      if (finalClassification === 'Business') {
        businessCount++;
      } else {
        individualCount++;
      }
      
      if (result.result?.sicCode) {
        sicCodeCount++;
      }

      const processedResult: PayeeClassification = {
        id: `${job.id}-${index}`,
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
    },
    {
      chunkSize: rawResults.length > 5000 ? 100 : 50,
      delayMs: 10,
      onProgress: onProgress
    }
  );

  processedResults.push(...results);

  const summary: BatchProcessingResult = {
    results: processedResults,
    successCount: businessCount + individualCount,
    failureCount: 0,
    processingTime: 0,
    originalFileData: payeeData.originalFileData || []
  };

  console.log(`[ENHANCED BATCH PROCESSOR] Complete: ${processedResults.length} results processed`);
  console.log(`[ENHANCED BATCH PROCESSOR] Business: ${businessCount}, Individual: ${individualCount}, Excluded: ${excludedCount}, SIC: ${sicCodeCount}`);

  return {
    finalClassifications: processedResults,
    summary
  };
}
