
import { PayeeClassification, BatchProcessingResult, ClassificationConfig } from '../types';
import { enhancedProcessBatchV3 } from '../classification/enhancedBatchProcessorV3';
import { DEFAULT_CLASSIFICATION_CONFIG } from '../classification/config';

/**
 * Unified batch processing service - consolidates all batch processing logic
 */
export class BatchProcessingService {
  private static instance: BatchProcessingService;
  
  static getInstance(): BatchProcessingService {
    if (!BatchProcessingService.instance) {
      BatchProcessingService.instance = new BatchProcessingService();
    }
    return BatchProcessingService.instance;
  }

  async processBatch(
    payeeNames: string[],
    config: ClassificationConfig = DEFAULT_CLASSIFICATION_CONFIG,
    originalFileData?: any[]
  ): Promise<BatchProcessingResult> {
    console.log(`[BATCH SERVICE] Processing ${payeeNames.length} payees`);
    
    // Use the proven V3 processor
    return await enhancedProcessBatchV3(payeeNames, config, originalFileData);
  }

  validateBatchInput(payeeNames: string[], originalFileData?: any[]): void {
    if (!payeeNames || payeeNames.length === 0) {
      throw new Error('No payee names provided for batch processing');
    }

    if (originalFileData && originalFileData.length !== payeeNames.length) {
      throw new Error(`Input misalignment: ${originalFileData.length} original rows vs ${payeeNames.length} payee names`);
    }
  }
}

export const batchProcessingService = BatchProcessingService.getInstance();
