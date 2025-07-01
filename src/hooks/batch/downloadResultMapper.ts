
import { mapResultsToOriginalRowsAsync } from "@/lib/rowMapping";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { PayeeRowData } from "@/lib/rowMapping";
import { testSicCodePipeline } from "@/lib/testing/sicCodeTest";

export async function mapAndFinalizeResults(
  finalClassifications: any[],
  payeeData: PayeeRowData,
  summary: any,
  jobId: string,
  onProgress: (processed: number, total: number, percentage: number) => void
): Promise<{
  fullResults: PayeeClassification[];
  updatedSummary: BatchProcessingResult;
}> {
  console.log(`[BATCH DOWNLOAD] Mapping ${finalClassifications.length} unique results to ${payeeData.originalFileData.length} original rows with chunked processing`);
  
  const mappedResults = await mapResultsToOriginalRowsAsync(
    finalClassifications, 
    payeeData,
    (processed, total, percentage) => {
      if (percentage % 20 === 0) { // Update every 20%
        onProgress(processed, total, percentage);
      }
    }
  );
  
  console.log(`[BATCH DOWNLOAD] Successfully mapped to ${mappedResults.length} original rows`);

  // Create full results with SIC validation
  const fullResults: PayeeClassification[] = mappedResults.map((row, index) => ({
    id: `${jobId}-${index}`,
    payeeName: row.original_payee_name || row.payeeName || `Unknown_${index}`,
    result: {
      classification: row.classification,
      confidence: row.confidence,
      reasoning: row.reasoning,
      processingTier: row.processingTier,
      processingMethod: row.processingMethod,
      sicCode: row.sicCode,
      sicDescription: row.sicDescription,
      matchingRules: [],
      keywordExclusion: {
        isExcluded: row.keywordExclusion === 'Yes',
        matchedKeywords: row.matchedKeywords ? row.matchedKeywords.split('; ') : [],
        confidence: parseFloat(row.keywordConfidence) || 0,
        reasoning: row.keywordReasoning
      }
    },
    timestamp: new Date(row.timestamp),
    originalData: row,
    rowIndex: index
  }));

  const updatedSummary: BatchProcessingResult = {
    ...summary,
    results: fullResults,
    originalFileData: payeeData.originalFileData
  };

  // Run comprehensive SIC pipeline test
  console.log('[BATCH DOWNLOAD] Running comprehensive SIC code pipeline test...');
  await testSicCodePipeline(updatedSummary);

  return { fullResults, updatedSummary };
}

export function logFinalValidation(fullResults: PayeeClassification[]) {
  const finalSicCount = fullResults.filter(r => r.result.sicCode).length;
  const finalBusinessCount = fullResults.filter(r => r.result.classification === 'Business').length;
  const finalCoverage = finalBusinessCount > 0 ? Math.round((finalSicCount / finalBusinessCount) * 100) : 0;
  
  console.log(`[BATCH DOWNLOAD] Final validation: ${finalSicCount}/${finalBusinessCount} (${finalCoverage}%) results have SIC codes`);
  
  return { finalSicCount, finalBusinessCount, finalCoverage };
}
