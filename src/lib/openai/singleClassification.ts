
import OpenAI from 'openai';
import { getOpenAIClient } from './client';
import { timeoutPromise } from './utils';
import { DEFAULT_API_TIMEOUT, CLASSIFICATION_MODEL } from './config';

/**
 * Classify a single payee name using the OpenAI API with SIC code determination
 */
export async function classifyPayeeWithAI(
  payeeName: string, 
  timeout: number = DEFAULT_API_TIMEOUT
): Promise<{
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
  sicCode?: string;
  sicDescription?: string;
}> {
  const openaiClient = getOpenAIClient();
  if (!openaiClient) {
    throw new Error("OpenAI client not initialized. Please set your API key first.");
  }

  if (!payeeName || payeeName.trim() === '') {
    throw new Error("Invalid payee name provided");
  }

  try {
    console.log(`[DEBUG] Classifying "${payeeName}" with OpenAI API including SIC code analysis...`);
    
    const apiCall = openaiClient.chat.completions.create({
      model: CLASSIFICATION_MODEL,
      messages: [
        {
          role: "system",
          content: `Classify payee names as "Business" or "Individual" and determine SIC codes for businesses. 

For businesses, provide:
- 4-digit SIC code (Standard Industrial Classification)
- SIC description
- Use SIC code 7389 (Business Services, NEC) for unclear business types
- Government entities use SIC 9199 (General Government, NEC)

For individuals, do not provide SIC codes.

Return JSON: {"classification": "Business|Individual", "confidence": number, "reasoning": "brief explanation", "sicCode": "4-digit code or null", "sicDescription": "description or null"}`
        },
        {
          role: "user",
          content: `Classify and determine SIC code for: "${payeeName}"`
        }
      ],
      response_format: { "type": "json_object" },
      temperature: 0.1,
      max_tokens: 200
    });
    
    console.log(`[DEBUG] Making API call with SIC analysis for "${payeeName}"...`);
    
    const response = await timeoutPromise(apiCall, timeout);

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response content from OpenAI API");
    }

    console.log(`[DEBUG] Raw OpenAI response for "${payeeName}":`, content);
    
    try {
      const result = JSON.parse(content);
      
      if (!result.classification || typeof result.confidence !== 'number' || !result.reasoning) {
        throw new Error(`Invalid response structure: ${JSON.stringify(result)}`);
      }
      
      // Validate SIC code format if provided
      if (result.sicCode && !/^\d{4}$/.test(result.sicCode)) {
        console.warn(`[DEBUG] Invalid SIC code format "${result.sicCode}" for "${payeeName}", setting to null`);
        result.sicCode = null;
        result.sicDescription = null;
      }
      
      console.log(`[DEBUG] Successfully classified "${payeeName}": ${result.classification} (${result.confidence}%) SIC: ${result.sicCode || 'N/A'}`);
      
      return {
        classification: result.classification as 'Business' | 'Individual',
        confidence: Math.min(100, Math.max(0, result.confidence)),
        reasoning: result.reasoning,
        sicCode: result.sicCode || undefined,
        sicDescription: result.sicDescription || undefined
      };
    } catch (parseError) {
      console.error(`[DEBUG] Failed to parse response for "${payeeName}":`, content);
      throw new Error("Failed to parse OpenAI response as JSON");
    }
  } catch (error) {
    console.error(`[DEBUG] Error calling OpenAI API for "${payeeName}":`, error);
    
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('authentication')) {
        throw new Error("Invalid OpenAI API key. Please check your API key and try again.");
      }
      if (error.message.includes('429')) {
        throw new Error("OpenAI API rate limit exceeded. Please wait a moment and try again.");
      }
      if (error.message.includes('timeout')) {
        throw new Error("OpenAI API request timed out. Please try again.");
      }
    }
    
    throw error;
  }
}
