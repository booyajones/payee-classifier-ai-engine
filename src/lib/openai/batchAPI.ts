
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
  sicCode?: string;
  sicDescription?: string;
}

/**
 * Create batch requests for payee classification with SIC codes
 */
function createBatchRequests(payeeNames: string[]): BatchJobRequest[] {
  return payeeNames.map((name, index) => ({
    custom_id: `payee-${index}-${Date.now()}`,
    method: 'POST',
    url: '/v1/chat/completions',
    body: {
      model: CLASSIFICATION_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an expert at classifying payee names as either "Business" or "Individual". 

For BUSINESS entities, you must also assign a 4-digit SIC (Standard Industrial Classification) code and description.

Return ONLY a JSON object with these exact fields:
- classification: "Business" or "Individual" 
- confidence: number (0-100)
- reasoning: string explaining the classification
- sicCode: string (4-digit code for businesses, null for individuals)
- sicDescription: string (description for businesses, null for individuals)

Example: {"classification": "Business", "confidence": 95, "reasoning": "Contains LLC suffix", "sicCode": "8742", "sicDescription": "Management Consulting Services"}`
        },
        {
          role: 'user',
          content: `Classify this payee name and assign SIC code if it's a business: "${name}"`
        }
      ],
      temperature: 0.1,
      max_tokens: 300
    }
  }));
}

/**
 * Process names in parallel using regular chat completions with SIC codes
 */
async function processWithChatCompletions(
  payeeNames: string[],
  onProgress?: (status: string, progress: number) => void
): Promise<BatchClassificationResult[]> {
  const client = getOpenAIClient();
  const results: BatchClassificationResult[] = [];
  const batchSize = 10;
  
  console.log(`[BATCH API] Processing ${payeeNames.length} names with SIC codes using model: ${CLASSIFICATION_MODEL}`);
  
  for (let i = 0; i < payeeNames.length; i += batchSize) {
    const batch = payeeNames.slice(i, i + batchSize);
    const batchPromises = batch.map(async (name, index) => {
      try {
        const response = await client.chat.completions.create({
          model: CLASSIFICATION_MODEL,
          messages: [
            {
              role: 'system',
              content: `You are an expert at classifying payee names as either "Business" or "Individual". 

For BUSINESS entities, you must also assign a 4-digit SIC (Standard Industrial Classification) code and description.

Return ONLY a JSON object with: classification, confidence (0-100), reasoning, sicCode (4-digit string for businesses, null for individuals), sicDescription (string for businesses, null for individuals)`
            },
            {
              role: 'user',
              content: `Classify this payee name and assign SIC code if it's a business: "${name}"`
            }
          ],
          temperature: 0.1,
          max_tokens: 300
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          
          // Debug SIC code assignment
          console.log(`[BATCH API SIC] "${name}": ${parsed.classification}, SIC: ${parsed.sicCode || 'None'}`);
          
          return {
            payeeName: name,
            classification: parsed.classification || 'Individual',
            confidence: parsed.confidence || 50,
            reasoning: parsed.reasoning || 'Classified via OpenAI with SIC codes',
            status: 'success' as const,
            sicCode: parsed.sicCode || undefined,
            sicDescription: parsed.sicDescription || undefined
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
    
    const progress = Math.round(((i + batch.length) / payeeNames.length) * 100);
    onProgress?.(`Processed ${i + batch.length} of ${payeeNames.length} names with SIC codes`, progress);
    
    if (i + batchSize < payeeNames.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Log SIC code statistics
  const businessResults = results.filter(r => r.classification === 'Business');
  const sicResults = results.filter(r => r.sicCode);
  console.log(`[BATCH API] SIC Statistics: ${sicResults.length}/${businessResults.length} businesses have SIC codes`);
  
  return results;
}

/**
 * Process batch classification using OpenAI API with SIC codes
 */
export async function processBatchClassification({
  payeeNames,
  onProgress
}: BatchClassificationRequest): Promise<BatchClassificationResult[]> {
  if (!payeeNames.length) {
    return [];
  }

  console.log(`[BATCH API] Starting batch classification with SIC codes for ${payeeNames.length} payees`);
  
  try {
    onProgress?.('Starting classification with SIC codes...', 10);
    
    const results = await processWithChatCompletions(payeeNames, (status, progress) => {
      onProgress?.(status, 10 + (progress * 0.9));
    });
    
    onProgress?.('Classification with SIC codes complete', 100);
    console.log(`[BATCH API] Completed classification with SIC codes: ${results.length} results`);
    
    return results;

  } catch (error) {
    console.error('[BATCH API] Processing with SIC codes failed:', error);
    
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
