
import { PayeeClassification, BatchProcessingResult, ClassificationConfig } from '../types';
import { processBatch } from '../classification/finalBatchProcessor';
import { DEFAULT_CLASSIFICATION_CONFIG } from '../classification/config';
import { PayeeRowData } from '../rowMapping';
import { batchValidationService } from './batchValidationService';
import { logger } from '../logging';

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
    originalFileData?: any[],
    jobId?: string
  ): Promise<BatchProcessingResult> {
    logger.info(`Processing ${payeeNames.length} payees with SIC code support`, 
      { count: payeeNames.length, jobId }, 'BATCH_SERVICE');
    
    // Ensure SIC codes are enabled in config
    const enhancedConfig = {
      ...config,
      useEnhanced: true,
      includeSicCodes: true
    };
    
    logger.debug(`Using enhanced config with SIC codes`, enhancedConfig, 'BATCH_SERVICE');
    
    // Use the final consolidated processor with SIC code support
    const result = await processBatch(payeeNames, enhancedConfig, originalFileData, jobId);
    
    // Log SIC code statistics
    const businessCount = result.results.filter(r => r.result.classification === 'Business').length;
    const sicCodeCount = result.results.filter(r => r.result.sicCode).length;
    
    logger.info(`SIC Code Results: ${sicCodeCount}/${businessCount} businesses have SIC codes`,
      { sicCodeCount, businessCount }, 'BATCH_SERVICE');
    
    return result;
  }

  validateBatchInput(payeeRowData: PayeeRowData): void {
    return batchValidationService.validateBatchInput(payeeRowData);
  }
}

export const batchProcessingService = BatchProcessingService.getInstance();
