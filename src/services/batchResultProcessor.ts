
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { processEnhancedBatchResults } from './enhancedBatchResultProcessor';

export function processBatchResults(
  rawResults: any[],
  uniquePayeeNames: string[],
  payeeData: PayeeRowData,
  job: BatchJob
): { finalClassifications: PayeeClassification[], summary: BatchProcessingResult } {
  console.log(`[BATCH PROCESSOR] Delegating to enhanced processor with comprehensive SIC validation`);
  
  // Use the enhanced processor with full validation
  return processEnhancedBatchResults(rawResults, uniquePayeeNames, payeeData, job);
}
