
import { checkKeywordExclusion, getComprehensiveExclusionKeywords } from './keywordExclusion';
import { checkKeywordExclusion as checkEnhancedKeywordExclusion } from './enhancedKeywordExclusion';

/**
 * Test function to verify keyword exclusion is working properly
 */
export function testKeywordExclusion() {
  console.log('[KEYWORD EXCLUSION TEST] Starting comprehensive test...');
  
  const testCases = [
    'Bank of America',
    'BANK OF AMERICA',
    'bank of america',
    'American Express',
    'AMERICAN EXPRESS',
    'Chase Bank',
    'Wells Fargo',
    'Citibank',
    'John Smith', // Should NOT be excluded
    'Mary Johnson', // Should NOT be excluded
    'ABC CORP',
    'XYZ LLC',
    'State Farm',
    'Blue Cross Blue Shield'
  ];
  
  const keywords = getComprehensiveExclusionKeywords();
  console.log(`[KEYWORD EXCLUSION TEST] Using ${keywords.length} exclusion keywords`);
  console.log(`[KEYWORD EXCLUSION TEST] Sample keywords:`, keywords.slice(0, 10));
  
  // Check if BANK is in the keywords
  const hasBankKeyword = keywords.some(k => k.toUpperCase().includes('BANK'));
  console.log(`[KEYWORD EXCLUSION TEST] Contains 'BANK' keyword: ${hasBankKeyword}`);
  
  testCases.forEach((testCase, index) => {
    console.log(`[KEYWORD EXCLUSION TEST] Test ${index + 1}: "${testCase}"`);
    
    // Test basic exclusion
    const basicResult = checkKeywordExclusion(testCase);
    console.log(`[KEYWORD EXCLUSION TEST] Basic result: ${basicResult.isExcluded ? 'EXCLUDED' : 'NOT EXCLUDED'}`);
    if (basicResult.isExcluded) {
      console.log(`[KEYWORD EXCLUSION TEST] Basic matched: ${basicResult.matchedKeywords.join(', ')}`);
    }
    
    // Test enhanced exclusion
    const enhancedResult = checkEnhancedKeywordExclusion(testCase);
    console.log(`[KEYWORD EXCLUSION TEST] Enhanced result: ${enhancedResult.isExcluded ? 'EXCLUDED' : 'NOT EXCLUDED'}`);
    if (enhancedResult.isExcluded) {
      console.log(`[KEYWORD EXCLUSION TEST] Enhanced matched: ${enhancedResult.matchedKeywords.join(', ')}`);
      console.log(`[KEYWORD EXCLUSION TEST] Enhanced reasoning: ${enhancedResult.reasoning}`);
    }
    
    console.log(`[KEYWORD EXCLUSION TEST] ---`);
  });
  
  console.log('[KEYWORD EXCLUSION TEST] Test completed');
}

/**
 * Quick test for a specific payee name
 */
export function quickTest(payeeName: string) {
  console.log(`[QUICK TEST] Testing: "${payeeName}"`);
  
  const result = checkEnhancedKeywordExclusion(payeeName);
  console.log(`[QUICK TEST] Result: ${result.isExcluded ? 'EXCLUDED' : 'NOT EXCLUDED'}`);
  
  if (result.isExcluded) {
    console.log(`[QUICK TEST] Matched keywords: ${result.matchedKeywords.join(', ')}`);
    console.log(`[QUICK TEST] Confidence: ${result.confidence}%`);
    console.log(`[QUICK TEST] Reasoning: ${result.reasoning}`);
  }
  
  return result;
}
