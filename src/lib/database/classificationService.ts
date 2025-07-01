// Updated classification service using consolidated database service
import { PayeeClassification } from '@/lib/types';
import { databaseService } from './consolidatedDatabaseService';
import { logger } from '@/lib/logging';

/**
 * Save classification results using consolidated database service
 */
export const saveClassificationResults = async (
  results: PayeeClassification[],
  batchId?: string
): Promise<void> => {
  if (results.length === 0) {
    logger.info('No classification results to save', null, 'CLASSIFICATION_SERVICE');
    return;
  }

  logger.info(`Saving ${results.length} classification results with SIC codes`, 
    { count: results.length, batchId }, 'CLASSIFICATION_SERVICE');
  
  // Enhanced SIC code and classification statistics
  const stats = {
    totalResults: results.length,
    businessResults: results.filter(r => r.result.classification === 'Business').length,
    individualResults: results.filter(r => r.result.classification === 'Individual').length,
    resultsWithSicCode: results.filter(r => r.result.sicCode).length,
    resultsWithSicDescription: results.filter(r => r.result.sicDescription).length
  };
  
  logger.info('Classification statistics', stats, 'CLASSIFICATION_SERVICE');

  return databaseService.saveClassificationResults(results);
};

/**
 * Load all classification results from database
 */
export const loadAllClassificationResults = async (): Promise<PayeeClassification[]> => {
  logger.info('Loading all classification results', null, 'CLASSIFICATION_SERVICE');
  
  // This would be implemented if needed - for now, classifications are loaded per batch
  return [];
};

/**
 * Clear all classification results from database
 */
export const clearAllClassificationResults = async (): Promise<void> => {
  logger.info('Clearing all classification results', null, 'CLASSIFICATION_SERVICE');
  
  // This would be implemented if needed - usually not required
  throw new Error('Clear all classifications not implemented - use specific batch deletion instead');
};
