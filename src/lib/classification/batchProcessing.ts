
import { ClassificationResult, ClassificationConfig } from '@/lib/types/unified';
import { createUnifiedEngine } from './unifiedEngine';
import { logger } from '@/lib/logging/logger';
import { errorHandler } from '@/lib/errors/errorHandler';

/**
 * Main entry point for batch processing using the unified classification engine
 */
export async function processBatch(
  payeeNames: string[], 
  onProgress?: (current: number, total: number, percentage: number, stats?: any) => void,
  config?: Partial<ClassificationConfig>
): Promise<ClassificationResult[]> {
  const context = 'BATCH_PROCESSING';
  
  try {
    logger.info(`Starting batch processing of ${payeeNames.length} payees`, { config }, context);
    
    // Create unified engine with configuration
    const engine = createUnifiedEngine(config);
    
    // Process batch using unified engine
    const results = await engine.processBatch(payeeNames, onProgress);
    
    // Convert to ClassificationResult format for backward compatibility
    const classificationResults = results.map(result => result.result);
    
    logger.info(`Batch processing completed successfully`, { 
      processed: classificationResults.length,
      total: payeeNames.length 
    }, context);
    
    return classificationResults;
  } catch (error) {
    const appError = errorHandler.handleClassificationError(error as Error);
    logger.error('Batch processing failed', { error: appError }, context);
    throw appError;
  }
}

// Export the unified engine for direct use
export { createUnifiedEngine } from './unifiedEngine';
