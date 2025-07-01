
import { checkEnhancedKeywordExclusion as checkKeywordExclusion } from '@/lib/classification/enhancedExclusionLogic';
import { KEYWORD_EXCLUSION_CONFIG } from '@/lib/classification/config';

/**
 * Apply keyword exclusions - ALWAYS ENABLED with enhanced logging
 */
export async function applyKeywordExclusions(payeeNames: string[]) {
  console.log(`[HYBRID BATCH] [KEYWORD EXCLUSION] Processing ${payeeNames.length} names - ALWAYS ENABLED`);
  console.log(`[HYBRID BATCH] [KEYWORD EXCLUSION] Config:`, KEYWORD_EXCLUSION_CONFIG);
  
  const exclusionResults = await Promise.all(payeeNames.map(async (name, index) => {
    console.log(`[HYBRID BATCH] [KEYWORD EXCLUSION] Processing ${index + 1}/${payeeNames.length}: "${name}"`);
    const result = await checkKeywordExclusion(name);
    
    if (KEYWORD_EXCLUSION_CONFIG.logMatches && result.isExcluded) {
      console.log(`[HYBRID BATCH] [KEYWORD EXCLUSION] ✓ EXCLUDED "${name}" - matched: ${result.matchedKeywords.join(', ')}`);
      console.log(`[HYBRID BATCH] [KEYWORD EXCLUSION] Reasoning: ${result.reasoning}`);
    } else if (!result.isExcluded) {
      console.log(`[HYBRID BATCH] [KEYWORD EXCLUSION] ✗ NOT EXCLUDED "${name}"`);
    }
    
    return result;
  }));
  
  const excludedCount = exclusionResults.filter(r => r.isExcluded).length;
  console.log(`[HYBRID BATCH] [KEYWORD EXCLUSION] SUMMARY: Excluded ${excludedCount}/${payeeNames.length} names`);
  
  // Log details of excluded items
  exclusionResults.forEach((result, index) => {
    if (result.isExcluded) {
      console.log(`[HYBRID BATCH] [KEYWORD EXCLUSION] EXCLUDED[${index}]: "${payeeNames[index]}" -> ${result.matchedKeywords.join(', ')}`);
    }
  });
  
  return exclusionResults;
}
