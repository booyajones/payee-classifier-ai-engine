import { getOpenAIClient } from './client';
import { DEFAULT_API_TIMEOUT, CLASSIFICATION_MODEL } from './config';
import { AiDuplicateJudgment } from '@/lib/services/duplicateDetectionTypes';

/**
 * AI-powered duplicate detection for ambiguous cases
 * Uses OpenAI to determine if two payee names represent the same entity
 */
export async function duplicateDetectionWithAI(
  payeeName1: string, 
  payeeName2: string
): Promise<AiDuplicateJudgment> {
  productionLogger.debug(`[AI DUPLICATE DETECTION] Analyzing: "${payeeName1}" vs "${payeeName2}"`);
  
  const client = getOpenAIClient();
  
  const prompt = `You are an expert at analyzing payee names to determine if they represent the same entity. Compare these two payee names and determine if they are duplicates.

PAYEE NAME 1: "${payeeName1}"
PAYEE NAME 2: "${payeeName2}"

SPECIFIC ANALYSIS REQUIRED:
1. Are these names referring to the same person or business entity?
2. Consider variations in business suffixes (INC, LLC, CORP, etc.) - these are usually the SAME entity
3. Consider case variations, abbreviations, and formatting differences
4. Consider partial names vs full names of the same entity

KEY DUPLICATE INDICATORS:
- Same core name with different business suffixes (INC, LLC, etc.) → DUPLICATE
- Case-only differences ("CHRISTA" vs "Christa") → DUPLICATE  
- Abbreviations vs full forms ("McDonald's" vs "McDonalds") → DUPLICATE
- Punctuation differences ("AT&T" vs "AT T") → DUPLICATE
- Partial vs full names of same entity ("J Smith" vs "John Smith") → DUPLICATE

IMPORTANT: Focus on whether these represent the SAME REAL-WORLD ENTITY, not just textual similarity.

Examples:
- "Christa INC" vs "CHRISTA" vs "Christa" → ALL DUPLICATES (same person/entity with variations)
- "WALMART INC" vs "WAL-MART STORES" → DUPLICATE (same company)
- "John Smith" vs "Jonathan Smith" → LIKELY NOT DUPLICATE (different people)
- "ABC Company LLC" vs "ABC Company Corp" → DUPLICATE (same business, different structure)

Return your analysis as JSON:
{
  "is_duplicate": boolean,
  "confidence": number (0-100),
  "reasoning": "Explain WHY these names represent the same or different real-world entities"
}`;

  try {
    const response = await client.chat.completions.create({
      model: CLASSIFICATION_MODEL,
      messages: [
        { 
          role: 'system', 
          content: 'You are a duplicate detection expert. Analyze payee names and return accurate JSON responses.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 300
    }, {
      timeout: DEFAULT_API_TIMEOUT
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    productionLogger.debug(`[AI DUPLICATE DETECTION] Raw response: ${content}`);

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result: AiDuplicateJudgment = JSON.parse(jsonMatch[0]);
    
    // Validate required fields
    if (typeof result.is_duplicate !== 'boolean' || 
        typeof result.confidence !== 'number' || 
        typeof result.reasoning !== 'string') {
      throw new Error('Invalid response format from OpenAI');
    }

    // Ensure confidence is within valid range
    result.confidence = Math.max(0, Math.min(100, result.confidence));
    
    productionLogger.debug(`[AI DUPLICATE DETECTION] Result: ${result.is_duplicate ? 'DUPLICATE' : 'NOT DUPLICATE'} (${result.confidence}%)`);
    productionLogger.debug(`[AI DUPLICATE DETECTION] Reasoning: ${result.reasoning}`);

    return result;

  } catch (error) {
    productionLogger.error(`[AI DUPLICATE DETECTION] Error analyzing "${payeeName1}" vs "${payeeName2}":`, error);
    
    // Return conservative fallback
    return {
      is_duplicate: false,
      confidence: 50,
      reasoning: `AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}. Conservative non-duplicate judgment applied.`
    };
  }
}

/**
 * Batch AI duplicate detection for multiple pairs
 */
export async function batchDuplicateDetectionWithAI(
  pairs: Array<{ payeeName1: string; payeeName2: string }>
): Promise<AiDuplicateJudgment[]> {
  productionLogger.debug(`[AI BATCH DUPLICATE DETECTION] Processing ${pairs.length} pairs`);
  
  const results: AiDuplicateJudgment[] = [];
  
  // Process pairs sequentially to avoid rate limits
  for (const pair of pairs) {
    try {
      const result = await duplicateDetectionWithAI(pair.payeeName1, pair.payeeName2);
      results.push(result);
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      productionLogger.error(`[AI BATCH DUPLICATE DETECTION] Failed for pair:`, pair, error);
      results.push({
        is_duplicate: false,
        confidence: 50,
        reasoning: 'Batch processing error - conservative non-duplicate judgment'
      });
    }
  }
  
  productionLogger.debug(`[AI BATCH DUPLICATE DETECTION] Completed ${results.length} judgments`);
  return results;
}
