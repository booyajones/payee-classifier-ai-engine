
import { BatchProcessingResult, PayeeClassification } from '@/lib/types';
import { BatchProcessorStats } from './types';
import { productionLogger } from '@/lib/logging';

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
  productionLogger.info(
    `Complete: ${processedCount} results processed`,
    undefined,
    'ENHANCED_BATCH_PROCESSOR'
  );
  productionLogger.info(
    `Business: ${stats.businessCount}, Individual: ${stats.individualCount}, Excluded: ${stats.excludedCount}, SIC: ${stats.sicCodeCount}`,
    undefined,
    'ENHANCED_BATCH_PROCESSOR'
  );
}
