
/**
 * SIC Code Validation and Error Checking for OpenAI Responses
 */

export interface SICValidationResult {
  isValid: boolean;
  sicCode?: string;
  sicDescription?: string;
  error?: string;
  warnings: string[];
}

export interface OpenAIResponseValidation {
  hasValidStructure: boolean;
  hasSICCode: boolean;
  sicValidation: SICValidationResult;
  errors: string[];
  warnings: string[];
}

/**
 * Validate SIC code structure and content
 */
export function validateSICCode(sicCode: any, sicDescription: any): SICValidationResult {
  const warnings: string[] = [];
  
  // Check if SIC code exists and is valid
  if (!sicCode) {
    return {
      isValid: false,
      error: 'SIC code is missing or null',
      warnings
    };
  }
  
  // Convert to string and validate format
  const sicString = String(sicCode).trim();
  
  if (sicString === '') {
    return {
      isValid: false,
      error: 'SIC code is empty string',
      warnings
    };
  }
  
  // SIC codes should be 2-4 digits
  if (!/^\d{2,4}$/.test(sicString)) {
    warnings.push(`SIC code format unusual: "${sicString}" (expected 2-4 digits)`);
  }
  
  // Validate description
  const descString = sicDescription ? String(sicDescription).trim() : '';
  if (!descString) {
    warnings.push('SIC description is missing or empty');
  }
  
  return {
    isValid: true,
    sicCode: sicString,
    sicDescription: descString || undefined,
    warnings
  };
}

/**
 * Validate complete OpenAI response for SIC codes
 */
export function validateOpenAIResponse(rawResult: any, payeeName: string): OpenAIResponseValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  console.log(`[SIC VALIDATOR] Validating OpenAI response for "${payeeName}"`);
  
  // Phase 1: Basic structure validation
  if (!rawResult?.response?.body?.choices?.[0]?.message?.content) {
    errors.push('Invalid OpenAI response structure - missing content');
    return {
      hasValidStructure: false,
      hasSICCode: false,
      sicValidation: { isValid: false, error: 'No response content', warnings: [] },
      errors,
      warnings
    };
  }
  
  const content = rawResult.response.body.choices[0].message.content;
  
  try {
    const parsed = JSON.parse(content);
    console.log(`[SIC VALIDATOR] Parsed response for "${payeeName}":`, {
      classification: parsed.classification,
      confidence: parsed.confidence,
      hasSicCode: !!parsed.sicCode,
      sicCode: parsed.sicCode,
      hasReasoning: !!parsed.reasoning
    });
    
    // Validate required fields
    if (!parsed.classification) {
      errors.push('Missing classification field');
    }
    
    if (parsed.confidence === undefined || parsed.confidence === null) {
      errors.push('Missing confidence field');
    }
    
    // SIC code validation for businesses
    let sicValidation: SICValidationResult = { isValid: true, warnings: [] };
    let hasSICCode = false;
    
    if (parsed.classification === 'Business') {
      sicValidation = validateSICCode(parsed.sicCode, parsed.sicDescription);
      hasSICCode = sicValidation.isValid;
      
      if (!sicValidation.isValid) {
        console.error(`[SIC VALIDATOR] ❌ Business "${payeeName}" SIC validation failed:`, sicValidation.error);
      } else {
        console.log(`[SIC VALIDATOR] ✅ Business "${payeeName}" has valid SIC: ${sicValidation.sicCode}`);
      }
    }
    
    return {
      hasValidStructure: errors.length === 0,
      hasSICCode,
      sicValidation,
      errors,
      warnings: [...warnings, ...sicValidation.warnings]
    };
    
  } catch (parseError) {
    const error = `JSON parse error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`;
    errors.push(error);
    console.error(`[SIC VALIDATOR] JSON parse failed for "${payeeName}":`, parseError);
    
    return {
      hasValidStructure: false,
      hasSICCode: false,
      sicValidation: { isValid: false, error, warnings: [] },
      errors,
      warnings
    };
  }
}

/**
 * Validate SIC code preservation during processing
 */
export function validateSICPreservation(
  originalSIC: { sicCode?: string; sicDescription?: string },
  processedSIC: { sicCode?: string; sicDescription?: string },
  payeeName: string
): { isPreserved: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (originalSIC.sicCode && !processedSIC.sicCode) {
    errors.push(`SIC code lost during processing: "${originalSIC.sicCode}" -> undefined`);
  } else if (originalSIC.sicCode !== processedSIC.sicCode) {
    warnings.push(`SIC code changed during processing: "${originalSIC.sicCode}" -> "${processedSIC.sicCode}"`);
  }
  
  if (originalSIC.sicDescription && !processedSIC.sicDescription) {
    warnings.push('SIC description lost during processing');
  }
  
  const isPreserved = errors.length === 0;
  
  if (isPreserved && originalSIC.sicCode) {
    console.log(`[SIC VALIDATOR] ✅ SIC preserved for "${payeeName}": ${processedSIC.sicCode}`);
  } else if (!isPreserved) {
    console.error(`[SIC VALIDATOR] ❌ SIC preservation failed for "${payeeName}":`, errors);
  }
  
  return { isPreserved, errors, warnings };
}
