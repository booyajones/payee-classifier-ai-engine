
import { PayeeClassification } from '../types';
import { classifyPayee } from './finalClassification';
import { logger } from '../logging';

/**
 * Handle retry logic for failed batch items
 */
export async function handleBatchRetries(
  retryQueue: Array<{ name: string; originalIndex: number; originalData?: any }>
): Promise<PayeeClassification[]> {
  if (retryQueue.length === 0) return [];

  logger.info(`Retrying ${retryQueue.length} failed items with enhanced fallback`, { count: retryQueue.length }, 'BATCH_RETRY');

  const retryPromises = retryQueue.map(async (item, index) => {
    try {
      // Add delay for retry
      await new Promise(resolve => setTimeout(resolve, index * 200));

      const result = await classifyPayee(item.name, { 
        aiThreshold: 75,
        bypassRuleNLP: true,
        offlineMode: true 
      });

      return {
        id: `payee-${item.originalIndex}`,
        payeeName: item.name,
        result: {
          ...result,
          reasoning: `${result.reasoning} (Retry with offline mode)`
        },
        timestamp: new Date(),
        originalData: item.originalData,
        rowIndex: item.originalIndex
      };

    } catch (error) {
      logger.error(`Retry failed for "${item.name}"`, error, 'BATCH_RETRY');

      // ABSOLUTE FALLBACK - Create a basic classification with proper typing
      const classification = item.name.split(/\s+/).length <= 2 ? 'Individual' as const : 'Business' as const;

      return {
        id: `payee-${item.originalIndex}`,
        payeeName: item.name,
        result: {
          classification,
          confidence: 51,
          reasoning: `Basic fallback classification due to system errors`,
          processingTier: 'Rule-Based' as const,
          processingMethod: 'Emergency basic fallback'
        },
        timestamp: new Date(),
        originalData: item.originalData,
        rowIndex: item.originalIndex
      };
    }
  });

  return await Promise.all(retryPromises);
}

/**
 * Create absolute fallback classification
 */
export function createFallbackClassification(
  payeeName: string,
  originalIndex: number,
  originalData?: any
): PayeeClassification {
  const classification = payeeName.split(/\s+/).length <= 2 ? 'Individual' as const : 'Business' as const;

  return {
    id: `payee-${originalIndex}`,
    payeeName,
    result: {
      classification,
      confidence: 51,
      reasoning: `Emergency fallback classification`,
      processingTier: 'Rule-Based' as const,
      processingMethod: 'Emergency fallback'
    },
    timestamp: new Date(),
    originalData,
    rowIndex: originalIndex
  };
}
