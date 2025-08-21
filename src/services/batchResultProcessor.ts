
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import {
  processEnhancedBatchResults,
  type BatchClassificationResult
} from './batchProcessor';

export async function processBatchResults(
  processedResults: BatchClassificationResult[],
  uniquePayeeNames: string[],
  payeeData: PayeeRowData,
  job: BatchJob
): Promise<{ finalClassifications: PayeeClassification[], summary: BatchProcessingResult }> {
  console.log(`[BATCH PROCESSOR] Processing ${processedResults.length} results with SIC validation`);
  
  // Log sample of what we're receiving
  if (processedResults.length > 0) {
    console.log(`[BATCH PROCESSOR] Sample result structure:`, {
      classification: processedResults[0].classification,
      confidence: processedResults[0].confidence,
      hasSicCode: !!processedResults[0].sicCode,
      sicCode: processedResults[0].sicCode,
      hasReasoning: !!processedResults[0].reasoning
    });
  }
  
  // Use the enhanced processor with the correct data format
  return await processEnhancedBatchResults({
    rawResults: processedResults,
    uniquePayeeNames,
    payeeData,
    job
  });
}
