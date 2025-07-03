
import { getOpenAIClient } from './client';
import { timeoutPromise } from './utils';
import { classifyPayeeWithAI } from './singleClassification';
import { DEFAULT_API_TIMEOUT, CLASSIFICATION_MODEL } from './config';

export const MAX_BATCH_SIZE = 5; // Reduced for better reliability

/**
 * Classify multiple payee names in a batch using the OpenAI API
 */
export async function classifyPayeesBatchWithAI(
  payeeNames: string[],
  timeout: number = DEFAULT_API_TIMEOUT
): Promise<Array<{
  payeeName: string;
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
}>> {
  const openaiClient = getOpenAIClient();
  if (!openaiClient) {
    throw new Error("OpenAI client not initialized. Please check your API key.");
  }

  if (!payeeNames.length) {
    return [];
  }

  console.log(`[BATCH] Starting classification of ${payeeNames.length} payees`);

  const results: Array<{
    payeeName: string;
    classification: 'Business' | 'Individual';
    confidence: number;
    reasoning: string;
  }> = [];

  // Process in smaller batches with reduced concurrency
  for (let i = 0; i < payeeNames.length; i += MAX_BATCH_SIZE) {
    const batchNames = payeeNames.slice(i, i + MAX_BATCH_SIZE);
    console.log(`[BATCH] Processing batch ${Math.floor(i/MAX_BATCH_SIZE) + 1} with ${batchNames.length} payees`);
    
    try {
      // Process names sequentially to avoid overwhelming the API
      const batchResults = [];
      for (const name of batchNames) {
        try {
          const result = await classifyPayeeWithAI(name, timeout);
          batchResults.push({
            payeeName: name,
            ...result
          });
        } catch (error) {
          console.error(`[INDIVIDUAL] Failed to classify ${name}:`, error);
          throw new Error(`Classification failed for ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      results.push(...batchResults);
      
      console.log(`[BATCH] Successfully processed batch ${Math.floor(i/MAX_BATCH_SIZE) + 1}`);
      
    } catch (error) {
      console.error(`[BATCH] Error with batch ${Math.floor(i/MAX_BATCH_SIZE) + 1}:`, error);
      throw error;
    }
  }
  
  console.log(`[BATCH] Completed classification of ${results.length} payees`);
  return results;
}
