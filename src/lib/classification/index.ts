
// Final consolidated classification module
export * from './config';
export * from './ruleBasedClassification';
export * from './nlpClassification';
export * from './aiClassification';
export * from './batchProcessing';

// Export specific functions from enhancedRules to avoid conflicts
export { 
  detectBusinessByExtendedRules, 
  detectIndividualByExtendedRules 
} from './enhancedRules';

// Export specific functions from stringMatching to avoid conflicts
export { 
  levenshteinDistance,
  jaroWinklerSimilarity,
  diceCoefficient,
  tokenSortRatio,
  calculateCombinedSimilarity,
  advancedNormalization
} from './stringMatching';

// Export final consolidated classification functions
export { classifyPayee } from './finalClassification';
export { processBatch, exportResultsWithOriginalDataV3 } from './finalBatchProcessor';

// Export enhanced keyword exclusion
export { 
  checkKeywordExclusion as checkEnhancedKeywordExclusion,
  bulkKeywordExclusion 
} from './enhancedKeywordExclusion';

// Export name processing
export * from './nameProcessing';

// Export batch utility modules
export * from './batchStatistics';
export * from './batchDeduplication';
export * from './batchRetryHandler';
export * from './batchExporter';
