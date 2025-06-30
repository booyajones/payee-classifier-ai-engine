
// Re-export all functionality from the refactored modules
export type { ExclusionResult } from './exclusionLogic';
export { checkKeywordExclusion, filterPayeeNames } from './exclusionLogic';
export { 
  getComprehensiveExclusionKeywords, 
  getDefaultExclusionKeywords, 
  validateExclusionKeywords 
} from './exclusionUtils';
export { 
  COMPREHENSIVE_EXCLUSION_KEYWORDS, 
  DEFAULT_EXCLUSION_KEYWORDS 
} from './exclusionKeywords';
