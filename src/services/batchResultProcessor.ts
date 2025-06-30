
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { processEnhancedBatchResults } from './enhancedBatchResultProcessor';

interface TrueBatchClassificationResult {
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
  sicCode?: string;
  sicDescription?: string;
}

export function processBatchResults(
  processedResults: TrueBatchClassificationResult[],
  uniquePayeeNames: string[],
  payeeData: PayeeRowData,
  job: BatchJob
): { finalClassifications: PayeeClassification[], summary: BatchProcessingResult } {
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
  return processEnhancedBatchResults(processedResults, uniquePayeeNames, payeeData, job);
}
