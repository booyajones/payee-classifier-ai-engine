
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { processEnhancedBatchResults } from './batchProcessor';
import { productionLogger } from '@/lib/logging/productionLogger';

interface TrueBatchClassificationResult {
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
  sicCode?: string;
  sicDescription?: string;
}

export async function processBatchResults(
  processedResults: TrueBatchClassificationResult[],
  uniquePayeeNames: string[],
  payeeData: PayeeRowData,
  job: BatchJob,
  onProgress?: (processed: number, total: number, percentage: number) => void
): Promise<{
  finalClassifications: PayeeClassification[];
  summary: BatchProcessingResult;
  error?: string;
}> {
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
  
  // Use the enhanced processor with error handling
  try {
    return await processEnhancedBatchResults({
      rawResults: processedResults,
      uniquePayeeNames,
      payeeData,
      job,
      onProgress
    });
  } catch (error) {
    productionLogger.error('[BATCH PROCESSOR] Enhanced processing failed', error, 'BATCH_PROCESSOR');
    return {
      finalClassifications: [],
      summary: {
        results: [],
        successCount: 0,
        failureCount: processedResults.length,
        originalFileData: payeeData.originalFileData
      },
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
