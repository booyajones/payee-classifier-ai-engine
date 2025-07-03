/**
 * Validation utilities for testing specific duplicate detection scenarios
 */
import { detectDuplicates } from '@/lib/services/duplicate';
import { isSameEntity, normalizeForDuplicateDetection } from '@/lib/classification/enhancedNormalization';

/**
 * Test the specific "Christa" issue reported by the user
 */
export async function testChristaIssue(): Promise<{
  success: boolean;
  details: {
    normalization: any[];
    entityChecks: any[];
    duplicateDetectionResult: any;
    finalVerification: string;
  };
}> {
  console.log('[CHRISTA TEST] Testing the specific Christa duplicate issue...');
  
  const testNames = ['Christa INC', 'CHRISTA', 'Christa'];
  
  // Test 1: Normalization
  const normalization = testNames.map(name => ({
    original: name,
    normalized: normalizeForDuplicateDetection(name)
  }));
  
  console.log('[CHRISTA TEST] Normalization results:', normalization);
  
  // Test 2: Entity checks
  const entityChecks = [];
  for (let i = 0; i < testNames.length; i++) {
    for (let j = i + 1; j < testNames.length; j++) {
      const result = isSameEntity(testNames[i], testNames[j]);
      entityChecks.push({
        name1: testNames[i],
        name2: testNames[j],
        isSameEntity: result
      });
    }
  }
  
  console.log('[CHRISTA TEST] Entity check results:', entityChecks);
  
  // Test 3: Full duplicate detection
  const duplicateInput = testNames.map((name, index) => ({
    payee_id: `christa_${index}`,
    payee_name: name
  }));
  
  const duplicateDetectionResult = await detectDuplicates(duplicateInput);
  
  console.log('[CHRISTA TEST] Duplicate detection result:', duplicateDetectionResult);
  
  // Test 4: Verification
  const duplicateGroups = duplicateDetectionResult.duplicate_groups;
  const hasDuplicateGroup = duplicateGroups.length > 0;
  const allChristaInOneGroup = hasDuplicateGroup && duplicateGroups[0].members.length === 3;
  
  const success = hasDuplicateGroup && allChristaInOneGroup;
  
  const finalVerification = success 
    ? '✅ SUCCESS: All three Christa variants detected as duplicates in a single group'
    : `❌ FAILED: Expected 1 group with 3 members, got ${duplicateGroups.length} groups with ${duplicateGroups.map(g => g.members.length).join(', ')} members`;
  
  console.log(`[CHRISTA TEST] ${finalVerification}`);
  
  return {
    success,
    details: {
      normalization,
      entityChecks,
      duplicateDetectionResult,
      finalVerification
    }
  };
}

/**
 * Test the specific "Valley" exclusion issue
 */
export async function testValleyExclusionIssue(): Promise<{
  success: boolean;
  details: {
    testCases: any[];
    finalVerification: string;
  };
}> {
  console.log('[VALLEY TEST] Testing the Valley/VA exclusion issue...');
  
  // Import the exclusion function
  const { checkEnhancedKeywordExclusion } = await import('@/lib/classification/enhancedExclusionLogic');
  
  const testCases = [
    { name: 'Valley Medical Center', shouldBeExcluded: false },
    { name: 'Missoula Valley Storage', shouldBeExcluded: false },
    { name: 'VA Medical Center', shouldBeExcluded: true },
    { name: 'US VA Hospital', shouldBeExcluded: true }
  ];
  
  const results = [];
  let allCorrect = true;
  
  for (const testCase of testCases) {
    const result = await checkEnhancedKeywordExclusion(testCase.name);
    const correct = result.isExcluded === testCase.shouldBeExcluded;
    
    if (!correct) allCorrect = false;
    
    results.push({
      ...testCase,
      actualExclusion: result.isExcluded,
      correct,
      matchedKeywords: result.matchedKeywords,
      confidence: result.confidence,
      reasoning: result.reasoning
    });
    
    console.log(`[VALLEY TEST] "${testCase.name}": Expected ${testCase.shouldBeExcluded ? 'EXCLUDED' : 'NOT EXCLUDED'}, Got ${result.isExcluded ? 'EXCLUDED' : 'NOT EXCLUDED'} - ${correct ? '✅' : '❌'}`);
  }
  
  const finalVerification = allCorrect
    ? '✅ SUCCESS: All Valley/VA test cases passed - VA matches whole words only'
    : `❌ FAILED: Some test cases failed - check detailed results`;
  
  console.log(`[VALLEY TEST] ${finalVerification}`);
  
  return {
    success: allCorrect,
    details: {
      testCases: results,
      finalVerification
    }
  };
}

/**
 * Run all validation tests
 */
export async function runAllValidationTests() {
  console.log('[VALIDATION] Running all validation tests...');
  
  const christaTest = await testChristaIssue();
  const valleyTest = await testValleyExclusionIssue();
  
  const allSuccess = christaTest.success && valleyTest.success;
  
  console.log('[VALIDATION] ========================================');
  console.log('[VALIDATION] FINAL VALIDATION RESULTS:');
  console.log(`[VALIDATION] Christa Duplicate Test: ${christaTest.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`[VALIDATION] Valley Exclusion Test: ${valleyTest.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`[VALIDATION] Overall Result: ${allSuccess ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  console.log('[VALIDATION] ========================================');
  
  return {
    allSuccess,
    christaTest,
    valleyTest
  };
}
