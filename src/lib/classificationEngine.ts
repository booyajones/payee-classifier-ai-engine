// Consolidated classification engine - final versions only
export { classifyPayee } from './classification/finalClassification';
export { processBatch } from './classification/finalBatchProcessor';
export { consensusClassification } from './openai/enhancedClassification';
export { getConfidenceLevel } from './classification/utils';
export { DEFAULT_CLASSIFICATION_CONFIG } from './classification/config';

// Export enhanced keyword exclusion
export { 
  checkKeywordExclusion as checkEnhancedKeywordExclusion,
  bulkKeywordExclusion 
} from './classification/enhancedKeywordExclusion';

// Export core functionality
export * from './classification';
export * from './openai/batchAPI';
export * from './openai/trueBatchAPI';
export * from './openai/hybridBatchProcessor';

// Export string matching utilities
export { 
  levenshteinDistance,
  jaroWinklerSimilarity,
  diceCoefficient,
  tokenSortRatio,
  calculateCombinedSimilarity,
  advancedNormalization
} from './classification/stringMatching';