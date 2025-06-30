
// Re-export all functionality from the refactored modules
export { calculateCombinedSimilarity, advancedNormalization } from './stringMatching';
export type { SimilarityScores } from './stringMatching';
export { isWholeWordMatch, testRegexPatterns, testNormalization } from './patternMatching';
export { 
  checkEnhancedKeywordExclusion as checkKeywordExclusion, 
  bulkEnhancedKeywordExclusion as bulkKeywordExclusion 
} from './enhancedExclusionLogic';
