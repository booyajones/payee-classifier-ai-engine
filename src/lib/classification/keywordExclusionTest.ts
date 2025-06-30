
import { checkKeywordExclusion, getComprehensiveExclusionKeywords } from './keywordExclusion';
import { checkKeywordExclusion as checkEnhancedKeywordExclusion } from './enhancedKeywordExclusion';

/**
 * Test function to verify keyword exclusion is working properly
 */
export function testKeywordExclusion() {
  console.log('[KEYWORD EXCLUSION TEST] === STARTING COMPREHENSIVE TEST ===');
  
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
  console.log(`[KEYWORD EXCLUSION TEST] Sample keywords:`, keywords.slice(0, 15));
  
  // Check if BANK is in the keywords
  const bankKeywords = keywords.filter(k => k.toUpperCase().includes('BANK'));
  console.log(`[KEYWORD EXCLUSION TEST] BANK-related keywords found:`, bankKeywords);
  
  // Check if AMERICAN is in the keywords
  const americanKeywords = keywords.filter(k => k.toUpperCase().includes('AMERICAN'));
  console.log(`[KEYWORD EXCLUSION TEST] AMERICAN-related keywords found:`, americanKeywords);
  
  console.log(`[KEYWORD EXCLUSION TEST] === TESTING INDIVIDUAL CASES ===`);
  
  testCases.forEach((testCase, index) => {
    console.log(`\n[KEYWORD EXCLUSION TEST] === Test ${index + 1}: "${testCase}" ===`);
    
    // Test enhanced exclusion with detailed logging
    const enhancedResult = checkEnhancedKeywordExclusion(testCase);
    
    console.log(`[KEYWORD EXCLUSION TEST] Final result for "${testCase}":`, {
      isExcluded: enhancedResult.isExcluded,
      matchedKeywords: enhancedResult.matchedKeywords,
      confidence: enhancedResult.confidence,
      reasoning: enhancedResult.reasoning
    });
  });
  
  console.log('\n[KEYWORD EXCLUSION TEST] === TEST COMPLETED ===');
}

/**
 * Quick test for a specific payee name
 */
export function quickTest(payeeName: string) {
  console.log(`\n[QUICK TEST] === TESTING: "${payeeName}" ===`);
  
  const result = checkEnhancedKeywordExclusion(payeeName);
  
  console.log(`[QUICK TEST] Final result:`, {
    isExcluded: result.isExcluded,
    matchedKeywords: result.matchedKeywords,
    confidence: result.confidence,
    reasoning: result.reasoning
  });
  
  return result;
}

/**
 * Test specific regex patterns independently
 */
export function testRegexOnly() {
  console.log('\n[REGEX ONLY TEST] === TESTING REGEX PATTERNS ===');
  
  const testCases = [
    { text: "BANK OF AMERICA", keyword: "BANK" },
    { text: "CITIBANK", keyword: "BANK" },
    { text: "BANKRUPT", keyword: "BANK" },
    { text: "AMERICAN EXPRESS", keyword: "AMERICAN" }
  ];
  
  testCases.forEach(({ text, keyword }) => {
    // Test the raw regex
    const pattern = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const matches = pattern.test(text);
    
    console.log(`[REGEX ONLY TEST] "${keyword}" in "${text}"`);
    console.log(`[REGEX ONLY TEST] Pattern: ${pattern.toString()}`);
    console.log(`[REGEX ONLY TEST] Matches: ${matches}`);
    console.log('---');
  });
}
