
import { checkEnhancedKeywordExclusion as checkKeywordExclusion } from './enhancedExclusionLogic';
import { quickSimilarityTest } from './stringMatching';

/**
 * Quick test function for debugging
 */
export async function quickTest(payeeName: string): Promise<void> {
  productionLogger.debug(`\n[QUICK TEST] Running quick test for: "${payeeName}"\n`);
  const result = await checkKeywordExclusion(payeeName);
  productionLogger.debug(`Result: ${result.isExcluded ? '✅ EXCLUDED' : '❌ NOT EXCLUDED'}`);
  productionLogger.debug(`Confidence: ${result.confidence}%`);
  productionLogger.debug(`Matched Keywords: ${result.matchedKeywords.join(', ') || 'None'}`);
  productionLogger.debug(`Reasoning: ${result.reasoning}`);
  productionLogger.debug('\n[QUICK TEST] Quick test complete!\n');
}

/**
 * Specific test for AT&T exclusion variants
 */
export async function testATTExclusion(): Promise<void> {
  productionLogger.debug('\n[AT&T EXCLUSION TEST] Testing AT&T variant exclusions...\n');
  
  const attVariants = [
    'AT&T',
    'AT & T', 
    'AT AND T',
    'ATT',
    'AT T',
    'AT&T INC',
    'AT&T CORP',
    'AT&T WIRELESS',
    'AT&T MOBILITY',
    'AT&T SERVICES',
    'AMERICAN TELEPHONE AND TELEGRAPH',
    'American Telephone & Telegraph Co',
    'att.com',
    'AT&T Communications',
    'at&t billing',
    'AT&T UNIVERSAL CARD'
  ];

  productionLogger.debug('Testing AT&T variants for exclusion:');
  for (let index = 0; index < attVariants.length; index++) {
    const variant = attVariants[index];
    productionLogger.debug(`\n--- Test ${index + 1}: "${variant}" ---`);
    const result = await checkKeywordExclusion(variant);
    
    productionLogger.debug(`Result: ${result.isExcluded ? '✅ EXCLUDED' : '❌ NOT EXCLUDED'}`);
    productionLogger.debug(`Confidence: ${result.confidence}%`);
    productionLogger.debug(`Matched Keywords: ${result.matchedKeywords.join(', ') || 'None'}`);
    productionLogger.debug(`Reasoning: ${result.reasoning}`);
    
    if (!result.isExcluded) {
      productionLogger.error(`❌ FAILED: "${variant}" should have been excluded!`);
    } else {
      productionLogger.debug(`✅ SUCCESS: "${variant}" properly excluded`);
    }
  }

  // Test edge cases that should NOT be excluded
  const nonAttNames = [
    'MATTHEW SMITH',
    'PATRICIA JONES', 
    'BATMAN ENTERPRISES',
    'BATTLE CREEK HOSPITAL',
    'ATTORNEY GENERAL OFFICE'
  ];

  productionLogger.debug('\n\nTesting names that should NOT be excluded (false positive check):');
  for (let index = 0; index < nonAttNames.length; index++) {
    const name = nonAttNames[index];
    productionLogger.debug(`\n--- False Positive Test ${index + 1}: "${name}" ---`);
    const result = await checkKeywordExclusion(name);
    
    productionLogger.debug(`Result: ${result.isExcluded ? '❌ EXCLUDED (should not be)' : '✅ NOT EXCLUDED'}`);
    if (result.isExcluded) {
      productionLogger.error(`❌ FALSE POSITIVE: "${name}" was incorrectly excluded!`);
      productionLogger.debug(`Matched Keywords: ${result.matchedKeywords.join(', ')}`);
    } else {
      productionLogger.debug(`✅ CORRECT: "${name}" properly allowed through`);
    }
  }

  productionLogger.debug('\n[AT&T EXCLUSION TEST] Test complete - check results above\n');
}

/**
 * Test function to validate keyword exclusion logic
 */
export async function testKeywordExclusion(): Promise<void> {
  productionLogger.debug('[KEYWORD EXCLUSION TEST] Running comprehensive test suite...\n');

  const testCases = [
    { name: 'Bank of America', expected: true },
    { name: 'PNC Bank', expected: true },
    { name: 'Chase Bank', expected: true },
    { name: 'Wells Fargo', expected: true },
    { name: 'AT&T', expected: true },
    { name: 'Verizon', expected: true },
    { name: 'George Smith', expected: false },
    { name: 'John Doe', expected: false },
    { name: 'Jane Smith', expected: false }
  ];

  for (let index = 0; index < testCases.length; index++) {
    const testCase = testCases[index];
    productionLogger.debug(`\n--- Test ${index + 1}: "${testCase.name}" ---`);
    const result = await checkKeywordExclusion(testCase.name);
    productionLogger.debug(`Result: ${result.isExcluded ? '✅ EXCLUDED' : '❌ NOT EXCLUDED'}`);
    productionLogger.debug(`Confidence: ${result.confidence}%`);
    productionLogger.debug(`Matched Keywords: ${result.matchedKeywords.join(', ') || 'None'}`);
    productionLogger.debug(`Reasoning: ${result.reasoning}`);

    if (result.isExcluded !== testCase.expected) {
      productionLogger.error(`❌ FAILED: "${testCase.name}" - Expected ${testCase.expected ? 'EXCLUDED' : 'NOT EXCLUDED'}`);
    } else {
      productionLogger.debug(`✅ SUCCESS: "${testCase.name}" - Properly classified`);
    }
  }

  // Add AT&T specific tests
  await testATTExclusion();
  
  productionLogger.debug('\n[KEYWORD EXCLUSION TEST] All tests complete! Check console output for detailed results.');
}

/**
 * Test similarity calculation
 */
export function testSimilarity(): void {
  productionLogger.debug('\n[SIMILARITY TEST] Running similarity tests...\n');

  const testCases = [
    { str1: 'Acme Corp', str2: 'Acme Corp', expectedCombined: 100 },
    { str1: 'Acme Corp', str2: 'ACME CORP', expectedCombined: 100 },
    { str1: 'Acme Corp', str2: 'Acme Corporation', expectedCombined: 90 },
    { str1: 'AT&T', str2: 'AT & T', expectedCombined: 90 },
    { str1: 'AT&T', str2: 'ATT', expectedCombined: 80 }
  ];

  testCases.forEach((testCase, index) => {
    productionLogger.debug(`\n--- Similarity Test ${index + 1}: "${testCase.str1}" vs "${testCase.str2}" ---`);
    const similarity = quickSimilarityTest(testCase.str1, testCase.str2);
    productionLogger.debug(`Combined Similarity: ${similarity.combined.toFixed(2)}%`);

    if (similarity.combined < testCase.expectedCombined) {
      productionLogger.error(`❌ FAILED: "${testCase.str1}" vs "${testCase.str2}" - Expected at least ${testCase.expectedCombined}%`);
    } else {
      productionLogger.debug(`✅ SUCCESS: "${testCase.str1}" vs "${testCase.str2}" - Passed`);
    }
  });

  productionLogger.debug('\n[SIMILARITY TEST] All similarity tests complete!\n');
}
