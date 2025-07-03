
import { PayeeRowData } from '@/lib/rowMapping';

export class BatchValidationService {
  private static instance: BatchValidationService;
  
  static getInstance(): BatchValidationService {
    if (!BatchValidationService.instance) {
      BatchValidationService.instance = new BatchValidationService();
    }
    return BatchValidationService.instance;
  }

  validateBatchInput(payeeRowData: PayeeRowData): void {
    console.log(`[BATCH VALIDATION] Validating batch input:`, {
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

    // Row mappings should match original file length
    if (payeeRowData.rowMappings.length !== payeeRowData.originalFileData.length) {
      throw new Error(`Row mapping misalignment: ${payeeRowData.rowMappings.length} mappings vs ${payeeRowData.originalFileData.length} original rows`);
    }

    // Validate that all payee names are valid
    const invalidPayees = payeeRowData.uniquePayeeNames.filter(name => !name || typeof name !== 'string' || name.trim() === '');
    if (invalidPayees.length > 0) {
      console.warn(`[BATCH VALIDATION] Found ${invalidPayees.length} invalid payee names`);
    }

    console.log(`[BATCH VALIDATION] Validation passed: ${payeeRowData.uniquePayeeNames.length} unique payees from ${payeeRowData.originalFileData.length} rows`);
  }
}

export const batchValidationService = BatchValidationService.getInstance();
