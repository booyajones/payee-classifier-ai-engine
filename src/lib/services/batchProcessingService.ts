
import { PayeeClassification, BatchProcessingResult, ClassificationConfig } from '../types';
import { enhancedProcessBatchV3 } from '../classification/enhancedBatchProcessorV3';
import { DEFAULT_CLASSIFICATION_CONFIG } from '../classification/config';
import { PayeeRowData } from '../rowMapping';
import { batchValidationService } from './batchValidationService';

/**
 * Unified batch processing service - consolidates all batch processing logic with SIC codes
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
    console.log(`[BATCH SERVICE] Processing ${payeeNames.length} payees with SIC code support`);
    
    // Ensure SIC codes are enabled in config
    const enhancedConfig = {
      ...config,
      useEnhanced: true,
      includeSicCodes: true
    };
    
    console.log(`[BATCH SERVICE] Using enhanced config with SIC codes:`, enhancedConfig);
    
    // Use the proven V3 processor with SIC code support
    const result = await enhancedProcessBatchV3(payeeNames, enhancedConfig, originalFileData);
    
    // Log SIC code statistics
    const businessCount = result.results.filter(r => r.result.classification === 'Business').length;
    const sicCodeCount = result.results.filter(r => r.result.sicCode).length;
    
    console.log(`[BATCH SERVICE] SIC Code Results: ${sicCodeCount}/${businessCount} businesses have SIC codes`);
    
    return result;
  }

  validateBatchInput(payeeRowData: PayeeRowData): void {
    return batchValidationService.validateBatchInput(payeeRowData);
  }
}

export const batchProcessingService = BatchProcessingService.getInstance();
