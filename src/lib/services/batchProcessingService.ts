
import { PayeeClassification, BatchProcessingResult, ClassificationConfig } from '../types';
import { enhancedProcessBatchV3 } from '../classification/enhancedBatchProcessorV3';
import { DEFAULT_CLASSIFICATION_CONFIG } from '../classification/config';
import { PayeeRowData } from '../rowMapping';

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
    console.log(`[BATCH SERVICE] Validating batch input:`, {
      uniquePayeeNames: payeeRowData.uniquePayeeNames.length,
      originalFileData: payeeRowData.originalFileData.length,
      rowMappings: payeeRowData.rowMappings.length
    });

    if (!payeeRowData.uniquePayeeNames || payeeRowData.uniquePayeeNames.length === 0) {
      throw new Error('No payee names provided for batch processing');
    }

    if (!payeeRowData.originalFileData || payeeRowData.originalFileData.length === 0) {
      throw new Error('No original file data provided for batch processing');
    }

    if (!payeeRowData.rowMappings || payeeRowData.rowMappings.length === 0) {
      throw new Error('No row mappings provided for batch processing');
    }

    // CORRECT VALIDATION: Row mappings should match original file length
    if (payeeRowData.rowMappings.length !== payeeRowData.originalFileData.length) {
      throw new Error(`Row mapping misalignment: ${payeeRowData.rowMappings.length} mappings vs ${payeeRowData.originalFileData.length} original rows`);
    }

    // Validate that all payee names are valid
    const invalidPayees = payeeRowData.uniquePayeeNames.filter(name => !name || typeof name !== 'string' || name.trim() === '');
    if (invalidPayees.length > 0) {
      console.warn(`[BATCH SERVICE] Found ${invalidPayees.length} invalid payee names`);
    }

    console.log(`[BATCH SERVICE] Validation passed: ${payeeRowData.uniquePayeeNames.length} unique payees from ${payeeRowData.originalFileData.length} rows`);
  }
}

export const batchProcessingService = BatchProcessingService.getInstance();
