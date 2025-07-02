import { detectDuplicates } from './duplicate';
import { DuplicateDetectionInput } from './duplicateDetectionTypes';

/**
 * Test cases for duplicate detection to validate logic
 */
export interface DuplicateTestCase {
  records: DuplicateDetectionInput[];
  expectedDuplicates: string[][]; // Arrays of payee_ids that should be grouped as duplicates
  description: string;
}

export const DUPLICATE_TEST_CASES: DuplicateTestCase[] = [
  // The reported issue: Christa variants
  {
    records: [
      { payee_id: "1", payee_name: "Christa INC" },
      { payee_id: "2", payee_name: "CHRISTA" },
      { payee_id: "3", payee_name: "Christa" }
    ],
    expectedDuplicates: [["1", "2", "3"]],
    description: "Christa variants should all be detected as duplicates"
  },
  
  // Business suffix variations
  {
    records: [
      { payee_id: "4", payee_name: "Apple Inc" },
      { payee_id: "5", payee_name: "Apple Corporation" },
      { payee_id: "6", payee_name: "Apple LLC" },
      { payee_id: "7", payee_name: "Microsoft Corp" }
    ],
    expectedDuplicates: [["4", "5", "6"]],
    description: "Apple with different business suffixes should be duplicates, Microsoft should be separate"
  },
  
  // Case variations
  {
    records: [
      { payee_id: "8", payee_name: "john smith" },
      { payee_id: "9", payee_name: "John Smith" },
      { payee_id: "10", payee_name: "JOHN SMITH" },
      { payee_id: "11", payee_name: "Jane Smith" }
    ],
    expectedDuplicates: [["8", "9", "10"]],
    description: "John Smith case variations should be duplicates, Jane Smith should be separate"
  },
  
  // Different entities (should NOT be duplicates)
  {
    records: [
      { payee_id: "12", payee_name: "Apple Inc" },
      { payee_id: "13", payee_name: "Microsoft Corp" },
      { payee_id: "14", payee_name: "Google LLC" }
    ],
    expectedDuplicates: [],
    description: "Completely different companies should not be duplicates"
  }
];

/**
 * Run duplicate detection tests to validate logic
 */
export async function runDuplicateTests(): Promise<{
  passed: number;
  failed: number;
  results: Array<{
    testCase: DuplicateTestCase;
    actualGroups: string[][];
    passed: boolean;
    details: string;
  }>;
}> {
  console.log('[DUPLICATE TESTING] Running duplicate detection validation tests...');
  
  const results = [];
  let passed = 0;
  let failed = 0;
  
  for (const testCase of DUPLICATE_TEST_CASES) {
    try {
      const result = await detectDuplicates(testCase.records);
      
      // Extract actual duplicate groups
      const actualGroups: string[][] = [];
      for (const group of result.duplicate_groups) {
        if (group.members.length > 1) {
          const memberIds = group.members.map(m => m.payee_id).sort();
          actualGroups.push(memberIds);
        }
      }
      
      // Sort groups for comparison
      actualGroups.sort((a, b) => a[0].localeCompare(b[0]));
      const expectedGroups = testCase.expectedDuplicates.map(group => group.sort()).sort((a, b) => a[0].localeCompare(b[0]));
      
      // Compare results
      const testPassed = JSON.stringify(actualGroups) === JSON.stringify(expectedGroups);
      
      if (testPassed) {
        passed++;
      } else {
        failed++;
      }
      
      const details = testPassed 
        ? `✅ PASS: ${testCase.description}`
        : `❌ FAIL: ${testCase.description}\nExpected groups: ${JSON.stringify(expectedGroups)}\nActual groups: ${JSON.stringify(actualGroups)}`;
      
      results.push({
        testCase,
        actualGroups,
        passed: testPassed,
        details
      });
      
      console.log(`[DUPLICATE TESTING] ${details}`);
      
    } catch (error) {
      failed++;
      const details = `❌ ERROR: ${testCase.description} - ${error}`;
      results.push({
        testCase,
        actualGroups: [],
        passed: false,
        details
      });
      console.error(`[DUPLICATE TESTING] ${details}`);
    }
  }
  
  console.log(`[DUPLICATE TESTING] Tests completed: ${passed} passed, ${failed} failed`);
  
  return { passed, failed, results };
}