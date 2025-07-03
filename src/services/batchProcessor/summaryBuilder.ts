
import { BatchProcessingResult, PayeeClassification } from '@/lib/types';
import { BatchProcessorStats } from './types';

export function buildBatchSummary(
  processedResults: PayeeClassification[],
  stats: BatchProcessorStats,
  originalFileData: any[]
): BatchProcessingResult {
  const summary: BatchProcessingResult = {
    results: processedResults,
    successCount: stats.businessCount + stats.individualCount,
    failureCount: 0,
    processingTime: 0,
    originalFileData: originalFileData || []
  };

  return summary;
}

export function logProcessingStats(
  processedCount: number,
  stats: BatchProcessorStats
): void {
  productionLogger.debug(`[ENHANCED BATCH PROCESSOR] Complete: ${processedCount} results processed`);
  productionLogger.debug(`[ENHANCED BATCH PROCESSOR] Business: ${stats.businessCount}, Individual: ${stats.individualCount}, Excluded: ${stats.excludedCount}, SIC: ${stats.sicCodeCount}`);
}
