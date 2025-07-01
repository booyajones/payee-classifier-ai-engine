
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

  // Process results in chunks to prevent browser blocking
  const { results } = await processInChunks(
    rawResults,
    async (result, index) => {
      const payeeName = uniquePayeeNames[index] || `Unknown_${index}`;
      return await processIndividualResult(result, index, payeeName, job.id, stats);
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
