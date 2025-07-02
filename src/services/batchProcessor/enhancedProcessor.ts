
import { processInChunks } from '@/lib/performance/chunkProcessor';
import { processIndividualResult } from './resultProcessor';
import { buildBatchSummary, logProcessingStats } from './summaryBuilder';
import { ProcessBatchResultsParams, ProcessBatchResultsReturn, BatchProcessorStats } from './types';

/**
 * Enhanced batch result processor with chunked processing and keyword exclusion
 * This is the new async version that replaces the old processBatchResults
 */
export async function processEnhancedBatchResults({
  rawResults,
  uniquePayeeNames,
  payeeData,
  job,
  onProgress
}: ProcessBatchResultsParams): Promise<ProcessBatchResultsReturn> {
  console.log(`[ENHANCED BATCH PROCESSOR] Processing ${rawResults.length} results with chunked keyword exclusion`);

  const processedResults: any[] = [];
  const stats: BatchProcessorStats = {
    businessCount: 0,
    individualCount: 0,
    excludedCount: 0,
    sicCodeCount: 0
  };

  // Process results in chunks to prevent browser blocking with ORIGINAL DATA PRESERVATION
  const { results } = await processInChunks(
    rawResults,
    async (result, index) => {
      const payeeName = uniquePayeeNames[index] || `Unknown_${index}`;
      
      // CRITICAL: Find and preserve original row data for each result
      let originalRowData = {};
      
      // Find the matching original row(s) for this payee name
      const matchingRows = payeeData.rowMappings.filter(mapping => 
        mapping.uniquePayeeIndex === index
      );
      
      if (matchingRows.length > 0) {
        // Use the first matching row's original data
        const firstMatch = matchingRows[0];
        originalRowData = payeeData.originalFileData[firstMatch.originalRowIndex] || {};
        console.log(`[ENHANCED PROCESSOR] Found original data for "${payeeName}" with ${Object.keys(originalRowData).length} columns`);
      } else {
        console.warn(`[ENHANCED PROCESSOR] No original data found for "${payeeName}" at index ${index}`);
      }
      
      return await processIndividualResult(result, index, payeeName, job.id, stats, originalRowData);
    },
    {
      chunkSize: rawResults.length > 5000 ? 100 : 50,
      delayMs: 10,
      onProgress: onProgress
    }
  );

  processedResults.push(...results);

  const summary = buildBatchSummary(processedResults, stats, payeeData.originalFileData);

  logProcessingStats(processedResults.length, stats);

  return {
    finalClassifications: processedResults,
    summary
  };
}
