import { getOpenAIClient } from './client';
import { CLASSIFICATION_MODEL } from './config';

export interface BatchJobRequest {
  custom_id: string;
  method: string;
  url: string;
  body: {
    model: string;
    messages: Array<{
      role: string;
      content: string;
    }>;
    temperature: number;
    max_tokens: number;
  };
}

export interface BatchClassificationRequest {
  payeeNames: string[];
  onProgress?: (status: string, progress: number) => void;
}

export interface BatchClassificationResult {
  payeeName: string;
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
  status: 'success' | 'failed';
  error?: string;
}

/**
 * Create batch requests for payee classification
 */
function createBatchRequests(payeeNames: string[]): BatchJobRequest[] {
  return payeeNames.map((name, index) => ({
    custom_id: `payee-${index}-${Date.now()}`,
    method: 'POST',
    url: '/v1/chat/completions',
    body: {
      model: CLASSIFICATION_MODEL, // Use the configured model
      messages: [
        {
          role: 'system',
          content: 'You are an expert at classifying payee names. Classify each name as either "Business" or "Individual". Return only a JSON object with classification, confidence (0-100), and reasoning.'
        },
        {
          role: 'user',
          content: `Classify this payee name: "${name}"\n\nReturn ONLY a JSON object like: {"classification": "Business", "confidence": 95, "reasoning": "Contains LLC suffix indicating business entity"}`
        }
      ],
      temperature: 0.1,
      max_tokens: 200
    }
  }));
}

/**
 * Process names in parallel using regular chat completions (fallback for older SDK versions)
 */
async function processWithChatCompletions(
  payeeNames: string[],
  onProgress?: (status: string, progress: number) => void
): Promise<BatchClassificationResult[]> {
  const client = getOpenAIClient();
  const results: BatchClassificationResult[] = [];
  const batchSize = 10; // Process in smaller batches to avoid rate limits
  
  console.log(`[BATCH API] Processing ${payeeNames.length} names with chat completions using model: ${CLASSIFICATION_MODEL}`);
  
  for (let i = 0; i < payeeNames.length; i += batchSize) {
    const batch = payeeNames.slice(i, i + batchSize);
    const batchPromises = batch.map(async (name, index) => {
      try {
        const response = await client.chat.completions.create({
          model: CLASSIFICATION_MODEL, // Use the configured model
          messages: [
            {
              role: 'system',
              content: 'You are an expert at classifying payee names. Classify each name as either "Business" or "Individual". Return only a JSON object with classification, confidence (0-100), and reasoning.'
            },
            {
              role: 'user',
              content: `Classify this payee name: "${name}"\n\nReturn ONLY a JSON object like: {"classification": "Business", "confidence": 95, "reasoning": "Contains LLC suffix indicating business entity"}`
            }
          ],
          temperature: 0.1,
          max_tokens: 200
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return {
            payeeName: name,
            classification: parsed.classification || 'Individual',
            confidence: parsed.confidence || 50,
            reasoning: parsed.reasoning || 'Classified via OpenAI',
            status: 'success' as const
          };
        }
      } catch (error) {
        console.error(`[BATCH API] Error processing ${name}:`, error);
        return {
          payeeName: name,
          classification: 'Individual' as const,
          confidence: 0,
          reasoning: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          status: 'failed' as const,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Update progress
    const progress = Math.round(((i + batch.length) / payeeNames.length) * 100);
    onProgress?.(`Processed ${i + batch.length} of ${payeeNames.length} names`, progress);
    
    // Small delay to respect rate limits
    if (i + batchSize < payeeNames.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

/**
 * Process batch classification using OpenAI API
 */
export async function processBatchClassification({
  payeeNames,
  onProgress
}: BatchClassificationRequest): Promise<BatchClassificationResult[]> {
  if (!payeeNames.length) {
    return [];
  }

  console.log(`[BATCH API] Starting batch classification for ${payeeNames.length} payees`);
  
  try {
    onProgress?.('Starting classification...', 10);
    
    // Use chat completions for processing
    const results = await processWithChatCompletions(payeeNames, (status, progress) => {
      onProgress?.(status, 10 + (progress * 0.9)); // 10-100% range
    });
    
    onProgress?.('Classification complete', 100);
    console.log(`[BATCH API] Completed classification: ${results.length} results`);
    
    return results;

  } catch (error) {
    console.error('[BATCH API] Processing failed:', error);
    
    // Return fallback results
    return payeeNames.map(name => ({
      payeeName: name,
      classification: 'Individual' as const,
      confidence: 0,
      reasoning: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      status: 'failed' as const,
      error: error instanceof Error ? error.message : 'Unknown error'
    }));
  }
}
