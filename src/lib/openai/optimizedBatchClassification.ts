
import { getOpenAIClient } from './client';
import { timeoutPromise } from './utils';
import { DEFAULT_API_TIMEOUT, CLASSIFICATION_MODEL } from './config';

export const OPTIMIZED_BATCH_SIZE = 10; // Reduced for better reliability
export const MAX_RETRIES = 2;
export const RETRY_DELAY_BASE = 1000;

interface CachedResult {
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
  timestamp: number;
}

// In-memory cache for session-based deduplication
const classificationCache = new Map<string, CachedResult>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Normalize name for caching
 */
function normalizeForCache(name: string): string {
  if (!name || typeof name !== 'string') {
    console.warn('[CACHE] Invalid name for caching:', name);
    return '';
  }
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Check if cached result is still valid
 */
function isCacheValid(result: CachedResult): boolean {
  if (!result || typeof result.timestamp !== 'number') {
    return false;
  }
  return Date.now() - result.timestamp < CACHE_TTL;
}

/**
 * Get cached result if available and valid
 */
function getCachedResult(name: string): CachedResult | null {
  if (!name || typeof name !== 'string') {
    return null;
  }
  
  const normalized = normalizeForCache(name);
  if (!normalized) {
    return null;
  }
  
  const cached = classificationCache.get(normalized);
  
  if (cached && isCacheValid(cached)) {
    console.log(`[CACHE] Using cached result for "${name}"`);
    return cached;
  }
  
  if (cached) {
    classificationCache.delete(normalized);
  }
  
  return null;
}

/**
 * Cache a classification result
 */
function setCachedResult(name: string, result: CachedResult): void {
  if (!name || typeof name !== 'string' || !result) {
    console.warn('[CACHE] Invalid data for caching:', { name, result });
    return;
  }
  
  const normalized = normalizeForCache(name);
  if (!normalized) {
    return;
  }
  
  classificationCache.set(normalized, {
    ...result,
    timestamp: Date.now()
  });
}

/**
 * Retry function with exponential backoff
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  baseDelay: number = RETRY_DELAY_BASE
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (error instanceof Error && 
          (error.message.includes('401') || error.message.includes('authentication'))) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`[RETRY] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Create fallback result for failed classifications
 */
function createFallbackResult(payeeName: string, error?: string): {
  payeeName: string;
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
  source: 'api';
} {
  return {
    payeeName,
    classification: 'Individual',
    confidence: 0,
    reasoning: error ? `Classification failed: ${error}` : 'Classification failed - using fallback',
    source: 'api'
  };
}

/**
 * Validate and sanitize API response
 */
function validateApiResponse(content: string, expectedCount: number): any[] {
  if (!content || typeof content !== 'string') {
    throw new Error('Invalid API response: empty or non-string content');
  }

  console.log(`[VALIDATION] Raw API response:`, content);
  
  // Clean the response - remove markdown formatting
  const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  let parsed: any;
  try {
    parsed = JSON.parse(cleanContent);
  } catch (parseError) {
    console.error(`[VALIDATION] JSON parse error:`, parseError);
    throw new Error(`Failed to parse API response as JSON: ${parseError}`);
  }

  // Extract array from various possible response structures
  let classifications: any[];
  if (Array.isArray(parsed)) {
    classifications = parsed;
  } else if (parsed && typeof parsed === 'object') {
    classifications = parsed.results || parsed.payees || parsed.classifications || parsed.data || [];
  } else {
    throw new Error('API response is not in expected format');
  }

  if (!Array.isArray(classifications)) {
    throw new Error('No valid classifications array found in response');
  }

  console.log(`[VALIDATION] Extracted ${classifications.length} classifications, expected ${expectedCount}`);

  // Validate each classification object
  const validatedClassifications = classifications.slice(0, expectedCount).map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Classification ${index} is not a valid object`);
    }

    const { name, classification, confidence, reasoning } = item;

    if (!classification || (classification !== 'Business' && classification !== 'Individual')) {
      throw new Error(`Invalid classification "${classification}" at index ${index}`);
    }

    if (typeof confidence !== 'number' || confidence < 0 || confidence > 100) {
      throw new Error(`Invalid confidence "${confidence}" at index ${index}`);
    }

    return {
      name: name || `Unknown-${index}`,
      classification,
      confidence: Math.min(100, Math.max(0, confidence)),
      reasoning: reasoning || 'No reasoning provided'
    };
  });

  return validatedClassifications;
}

/**
 * Classify multiple payees in an optimized batch
 */
export async function optimizedBatchClassification(
  payeeNames: string[],
  timeout: number = DEFAULT_API_TIMEOUT
): Promise<Array<{
  payeeName: string;
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
  source: 'cache' | 'api';
}>> {
  console.log(`[OPTIMIZED] Starting classification of ${payeeNames.length} payees`);

  // Input validation
  if (!Array.isArray(payeeNames)) {
    console.error('[OPTIMIZED] Invalid input: payeeNames is not an array');
    return [];
  }

  const openaiClient = getOpenAIClient();
  if (!openaiClient) {
    throw new Error("OpenAI client not initialized. Please check your API key.");
  }

  // Filter and validate names
  const validNames = payeeNames.filter(name => name && typeof name === 'string' && name.trim());
  if (validNames.length === 0) {
    console.warn('[OPTIMIZED] No valid names to process');
    return [];
  }

  const results: Array<{
    payeeName: string;
    classification: 'Business' | 'Individual';
    confidence: number;
    reasoning: string;
    source: 'cache' | 'api';
  }> = [];

  // Step 1: Check cache
  const uncachedNames: string[] = [];
  for (const name of validNames) {
    try {
      const cached = getCachedResult(name);
      if (cached) {
        results.push({
          payeeName: name,
          classification: cached.classification,
          confidence: cached.confidence,
          reasoning: cached.reasoning,
          source: 'cache'
        });
      } else {
        uncachedNames.push(name);
      }
    } catch (error) {
      console.error(`[OPTIMIZED] Cache error for "${name}":`, error);
      uncachedNames.push(name);
    }
  }

  console.log(`[OPTIMIZED] Cache: ${results.length} hits, ${uncachedNames.length} need API`);

  // Step 2: Process uncached names in batches
  if (uncachedNames.length > 0) {
    for (let i = 0; i < uncachedNames.length; i += OPTIMIZED_BATCH_SIZE) {
      const batchNames = uncachedNames.slice(i, i + OPTIMIZED_BATCH_SIZE);
      const batchNumber = Math.floor(i / OPTIMIZED_BATCH_SIZE) + 1;
      
      console.log(`[OPTIMIZED] Processing batch ${batchNumber} with ${batchNames.length} names`);
      
      try {
        const batchResults = await withRetry(async () => {
          const prompt = `Classify each payee name as "Business" or "Individual". Return ONLY a JSON array:
[
  {"name": "payee_name", "classification": "Business", "confidence": 95, "reasoning": "brief reason"},
  {"name": "next_payee", "classification": "Individual", "confidence": 90, "reasoning": "brief reason"}
]

Names to classify:
${batchNames.map((name, idx) => `${idx + 1}. "${name}"`).join('\n')}`;

          const apiCall = openaiClient.chat.completions.create({
            model: CLASSIFICATION_MODEL,
            messages: [
              {
                role: "system",
                content: "You are an expert classifier. Return only valid JSON array, no other text."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.1,
            max_tokens: 800
          });
          
          return await timeoutPromise(apiCall, timeout);
        });

        const content = batchResults?.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error("No response content from OpenAI API");
        }

        // Validate and parse response
        const validatedClassifications = validateApiResponse(content, batchNames.length);

        // Process results
        validatedClassifications.forEach((result, index) => {
          if (index < batchNames.length) {
            const originalName = batchNames[index];
            const classificationResult = {
              payeeName: originalName,
              classification: result.classification as 'Business' | 'Individual',
              confidence: result.confidence,
              reasoning: result.reasoning,
              source: 'api' as const
            };
            
            results.push(classificationResult);
            
            // Cache the result
            try {
              setCachedResult(originalName, {
                classification: classificationResult.classification,
                confidence: classificationResult.confidence,
                reasoning: classificationResult.reasoning,
                timestamp: Date.now()
              });
            } catch (cacheError) {
              console.warn(`[OPTIMIZED] Failed to cache result for "${originalName}":`, cacheError);
            }
            
            console.log(`[OPTIMIZED] Classified "${originalName}": ${result.classification} (${result.confidence}%)`);
          }
        });
        
        // Handle missing results
        if (validatedClassifications.length < batchNames.length) {
          for (let j = validatedClassifications.length; j < batchNames.length; j++) {
            const missingName = batchNames[j];
            if (missingName) {
              results.push(createFallbackResult(missingName, 'Incomplete API response'));
            }
          }
        }
        
      } catch (error) {
        console.error(`[OPTIMIZED] Batch ${batchNumber} failed:`, error);
        
        // Create fallback results for this batch
        batchNames.forEach(name => {
          if (name) {
            results.push(createFallbackResult(name, error instanceof Error ? error.message : 'Unknown error'));
          }
        });
      }
    }
  }
  
  // Step 3: Ensure all input names have results
  const orderedResults = validNames.map(name => {
    const result = results.find(r => r.payeeName === name);
    if (!result) {
      console.warn(`[OPTIMIZED] Missing result for "${name}", creating fallback`);
      return createFallbackResult(name, 'No result found');
    }
    return result;
  });
  
  console.log(`[OPTIMIZED] Completed: ${orderedResults.length} total, ${results.filter(r => r.source === 'cache').length} cached, ${results.filter(r => r.source === 'api').length} from API`);
  return orderedResults;
}

/**
 * Clear the classification cache
 */
export function clearClassificationCache(): void {
  classificationCache.clear();
  console.log('[CACHE] Classification cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; hitRate: number } {
  return {
    size: classificationCache.size,
    hitRate: 0
  };
}
