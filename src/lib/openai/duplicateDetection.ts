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
  console.log(`[AI DUPLICATE DETECTION] Analyzing: "${payeeName1}" vs "${payeeName2}"`);
  
  const client = getOpenAIClient();
  
  const prompt = `You are an expert at analyzing payee names to determine if they represent the same entity. Compare these two payee names and determine if they are duplicates.

PAYEE NAME 1: "${payeeName1}"
PAYEE NAME 2: "${payeeName2}"

Consider these factors:
1. Business entities: Different legal structures (LLC vs Corp) of the same company ARE duplicates
2. Abbreviations: "McDonald's" vs "McDonalds" ARE duplicates  
3. Punctuation/spacing: "AT&T" vs "AT T" vs "ATT" ARE duplicates
4. Common variations: "John Smith" vs "John W Smith" vs "J Smith" ARE duplicates
5. Address differences: Same name with different addresses ARE duplicates
6. Completely different entities: "Apple Inc" vs "Microsoft Corp" are NOT duplicates

Examples:
- "WALMART INC" vs "WAL-MART STORES" → DUPLICATE (same company)
- "John Smith" vs "Jonathan Smith" → NOT DUPLICATE (different people)  
- "ABC Company LLC" vs "ABC Company Corp" → DUPLICATE (same business)
- "McDonald's #123" vs "McDonalds Restaurant" → DUPLICATE (same business)

Return your analysis as JSON:
{
  "is_duplicate": boolean,
  "confidence": number (0-100),
  "reasoning": "Brief explanation of your decision"
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

    console.log(`[AI DUPLICATE DETECTION] Raw response: ${content}`);

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
    
    console.log(`[AI DUPLICATE DETECTION] Result: ${result.is_duplicate ? 'DUPLICATE' : 'NOT DUPLICATE'} (${result.confidence}%)`);
    console.log(`[AI DUPLICATE DETECTION] Reasoning: ${result.reasoning}`);

    return result;

  } catch (error) {
    console.error(`[AI DUPLICATE DETECTION] Error analyzing "${payeeName1}" vs "${payeeName2}":`, error);
    
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
  console.log(`[AI BATCH DUPLICATE DETECTION] Processing ${pairs.length} pairs`);
  
  const results: AiDuplicateJudgment[] = [];
  
  // Process pairs sequentially to avoid rate limits
  for (const pair of pairs) {
    try {
      const result = await duplicateDetectionWithAI(pair.payeeName1, pair.payeeName2);
      results.push(result);
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`[AI BATCH DUPLICATE DETECTION] Failed for pair:`, pair, error);
      results.push({
        is_duplicate: false,
        confidence: 50,
        reasoning: 'Batch processing error - conservative non-duplicate judgment'
      });
    }
  }
  
  console.log(`[AI BATCH DUPLICATE DETECTION] Completed ${results.length} judgments`);
  return results;
}