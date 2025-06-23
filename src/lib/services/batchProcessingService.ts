
import { PayeeClassification, BatchProcessingResult, ClassificationConfig } from '../types';
import { enhancedProcessBatchV3 } from '../classification/enhancedBatchProcessorV3';
import { DEFAULT_CLASSIFICATION_CONFIG } from '../classification/config';
import { PayeeRowData } from '../rowMapping';
import { batchValidationService } from './batchValidationService';

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

  validateBatchInput(payeeRowData: PayeeRowData): void {
    return batchValidationService.validateBatchInput(payeeRowData);
  }
}

export const batchProcessingService = BatchProcessingService.getInstance();
