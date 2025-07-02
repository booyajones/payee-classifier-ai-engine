import { checkEnhancedKeywordExclusion } from './enhancedExclusionLogic';

/**
 * Test cases for keyword exclusion to validate whole-word matching
 */
export interface ExclusionTestCase {
  payeeName: string;
  shouldBeExcluded: boolean;
  expectedKeywords?: string[];
  description: string;
}

export const EXCLUSION_TEST_CASES: ExclusionTestCase[] = [
  // Problematic cases that were incorrectly excluded
  {
    payeeName: "Valley Medical Center",
    shouldBeExcluded: false,
    description: "Should NOT be excluded for 'VA' keyword - Valley contains VA but is not the word VA"
  },
  {
    payeeName: "Missoula Valley Storage", 
    shouldBeExcluded: false,
    description: "Should NOT be excluded for 'VA' keyword - Valley contains VA but is not the word VA"
  },
  {
    payeeName: "Bank of America",
    shouldBeExcluded: false,
    description: "Should NOT be excluded for 'BANK' if BANK is not in exclusion list"
  },
  
  // Valid exclusions that should work
  {
    payeeName: "VA Medical Center",
    shouldBeExcluded: true,
    expectedKeywords: ["VA"],
    description: "Should be excluded for 'VA' keyword - exact word match"
  },
  {
    payeeName: "US VA Hospital",
    shouldBeExcluded: true,
    expectedKeywords: ["VA"], 
    description: "Should be excluded for 'VA' keyword - whole word in middle"
  },
  {
    payeeName: "Hospital VA",
    shouldBeExcluded: true,
    expectedKeywords: ["VA"],
    description: "Should be excluded for 'VA' keyword - whole word at end"
  },
  
  // Edge cases for common keywords
  {
    payeeName: "Citibank Corporation",
    shouldBeExcluded: false,
    description: "Should NOT be excluded for 'BANK' - not a standalone word"
  },
  {
    payeeName: "First Bank",
    shouldBeExcluded: true,
    expectedKeywords: ["BANK"],
    description: "Should be excluded for 'BANK' keyword - whole word match"
  }
];

/**
 * Run exclusion tests to validate keyword matching logic
 */
export async function runExclusionTests(): Promise<{
  passed: number;
  failed: number;
  results: Array<{
    testCase: ExclusionTestCase;
    result: any;
    passed: boolean;
    details: string;
  }>;
}> {
  console.log('[EXCLUSION TESTING] Running exclusion validation tests...');
  
  const results = [];
  let passed = 0;
  let failed = 0;
  
  for (const testCase of EXCLUSION_TEST_CASES) {
    try {
      const result = await checkEnhancedKeywordExclusion(testCase.payeeName);
      const testPassed = result.isExcluded === testCase.shouldBeExcluded;
      
      if (testPassed) {
        passed++;
      } else {
        failed++;
      }
      
      const details = testPassed 
        ? `✅ PASS: ${testCase.description}`
        : `❌ FAIL: ${testCase.description} - Expected excluded: ${testCase.shouldBeExcluded}, Got: ${result.isExcluded}. Matched: ${result.matchedKeywords.join(', ')}`;
      
      results.push({
        testCase,
        result,
        passed: testPassed,
        details
      });
      
      console.log(`[EXCLUSION TESTING] ${details}`);
      
    } catch (error) {
      failed++;
      const details = `❌ ERROR: ${testCase.description} - ${error}`;
      results.push({
        testCase,
        result: null,
        passed: false,
        details
      });
      console.error(`[EXCLUSION TESTING] ${details}`);
    }
  }
  
  console.log(`[EXCLUSION TESTING] Tests completed: ${passed} passed, ${failed} failed`);
  
  return { passed, failed, results };
}