
import { checkEnhancedKeywordExclusion as checkKeywordExclusion } from './enhancedExclusionLogic';
import { quickSimilarityTest } from './stringMatching';

/**
 * Quick test function for debugging
 */
export async function quickTest(payeeName: string): Promise<void> {
  console.log(`\n[QUICK TEST] Running quick test for: "${payeeName}"\n`);
  const result = await checkKeywordExclusion(payeeName);
  console.log(`Result: ${result.isExcluded ? '✅ EXCLUDED' : '❌ NOT EXCLUDED'}`);
  console.log(`Confidence: ${result.confidence}%`);
  console.log(`Matched Keywords: ${result.matchedKeywords.join(', ') || 'None'}`);
  console.log(`Reasoning: ${result.reasoning}`);
  console.log('\n[QUICK TEST] Quick test complete!\n');
}

/**
 * Specific test for AT&T exclusion variants
 */
export async function testATTExclusion(): Promise<void> {
  console.log('\n[AT&T EXCLUSION TEST] Testing AT&T variant exclusions...\n');
  
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

  console.log('Testing AT&T variants for exclusion:');
  for (let index = 0; index < attVariants.length; index++) {
    const variant = attVariants[index];
    console.log(`\n--- Test ${index + 1}: "${variant}" ---`);
    const result = await checkKeywordExclusion(variant);
    
    console.log(`Result: ${result.isExcluded ? '✅ EXCLUDED' : '❌ NOT EXCLUDED'}`);
    console.log(`Confidence: ${result.confidence}%`);
    console.log(`Matched Keywords: ${result.matchedKeywords.join(', ') || 'None'}`);
    console.log(`Reasoning: ${result.reasoning}`);
    
    if (!result.isExcluded) {
      console.error(`❌ FAILED: "${variant}" should have been excluded!`);
    } else {
      console.log(`✅ SUCCESS: "${variant}" properly excluded`);
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

  console.log('\n\nTesting names that should NOT be excluded (false positive check):');
  for (let index = 0; index < nonAttNames.length; index++) {
    const name = nonAttNames[index];
    console.log(`\n--- False Positive Test ${index + 1}: "${name}" ---`);
    const result = await checkKeywordExclusion(name);
    
    console.log(`Result: ${result.isExcluded ? '❌ EXCLUDED (should not be)' : '✅ NOT EXCLUDED'}`);
    if (result.isExcluded) {
      console.error(`❌ FALSE POSITIVE: "${name}" was incorrectly excluded!`);
      console.log(`Matched Keywords: ${result.matchedKeywords.join(', ')}`);
    } else {
      console.log(`✅ CORRECT: "${name}" properly allowed through`);
    }
  }

  console.log('\n[AT&T EXCLUSION TEST] Test complete - check results above\n');
}

/**
 * Test function to validate keyword exclusion logic
 */
export async function testKeywordExclusion(): Promise<void> {
  console.log('[KEYWORD EXCLUSION TEST] Running comprehensive test suite...\n');

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
    console.log(`\n--- Test ${index + 1}: "${testCase.name}" ---`);
    const result = await checkKeywordExclusion(testCase.name);
    console.log(`Result: ${result.isExcluded ? '✅ EXCLUDED' : '❌ NOT EXCLUDED'}`);
    console.log(`Confidence: ${result.confidence}%`);
    console.log(`Matched Keywords: ${result.matchedKeywords.join(', ') || 'None'}`);
    console.log(`Reasoning: ${result.reasoning}`);

    if (result.isExcluded !== testCase.expected) {
      console.error(`❌ FAILED: "${testCase.name}" - Expected ${testCase.expected ? 'EXCLUDED' : 'NOT EXCLUDED'}`);
    } else {
      console.log(`✅ SUCCESS: "${testCase.name}" - Properly classified`);
    }
  }

  // Add AT&T specific tests
  await testATTExclusion();
  
  console.log('\n[KEYWORD EXCLUSION TEST] All tests complete! Check console output for detailed results.');
}

/**
 * Test similarity calculation
 */
export function testSimilarity(): void {
  console.log('\n[SIMILARITY TEST] Running similarity tests...\n');

  const testCases = [
    { str1: 'Acme Corp', str2: 'Acme Corp', expectedCombined: 100 },
    { str1: 'Acme Corp', str2: 'ACME CORP', expectedCombined: 100 },
    { str1: 'Acme Corp', str2: 'Acme Corporation', expectedCombined: 90 },
    { str1: 'AT&T', str2: 'AT & T', expectedCombined: 90 },
    { str1: 'AT&T', str2: 'ATT', expectedCombined: 80 }
  ];

  testCases.forEach((testCase, index) => {
    console.log(`\n--- Similarity Test ${index + 1}: "${testCase.str1}" vs "${testCase.str2}" ---`);
    const similarity = quickSimilarityTest(testCase.str1, testCase.str2);
    console.log(`Combined Similarity: ${similarity.combined.toFixed(2)}%`);

    if (similarity.combined < testCase.expectedCombined) {
      console.error(`❌ FAILED: "${testCase.str1}" vs "${testCase.str2}" - Expected at least ${testCase.expectedCombined}%`);
    } else {
      console.log(`✅ SUCCESS: "${testCase.str1}" vs "${testCase.str2}" - Passed`);
    }
  });

  console.log('\n[SIMILARITY TEST] All similarity tests complete!\n');
}
