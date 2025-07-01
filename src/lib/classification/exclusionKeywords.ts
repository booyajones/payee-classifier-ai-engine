
// Re-export all keyword arrays and utilities from the refactored modules
export { 
  BUSINESS_KEYWORDS, 
  FINANCIAL_KEYWORDS, 
  GOVERNMENT_KEYWORDS 
} from './coreExclusionKeywords';

export { 
  UTILITY_KEYWORDS, 
  TECHNOLOGY_TELECOM_KEYWORDS, 
  HEALTHCARE_KEYWORDS, 
  PAYROLL_SERVICE_KEYWORDS, 
  AUTOMOTIVE_KEYWORDS 
} from './utilityKeywords';

export { 
  DEFAULT_EXCLUSION_KEYWORDS, 
  EMERGENCY_FALLBACK_KEYWORDS 
} from './basicExclusionKeywords';

export { 
  validateExclusionKeywords, 
  getKeywordStatistics, 
  mergeKeywordArrays, 
  searchKeywords, 
  getKeywordsByCategory,
  type KeywordValidationResult 
} from './keywordUtils';

// Import all keyword arrays for the comprehensive list
import { 
  BUSINESS_KEYWORDS, 
  FINANCIAL_KEYWORDS, 
  GOVERNMENT_KEYWORDS 
} from './coreExclusionKeywords';
import { 
  UTILITY_KEYWORDS, 
  TECHNOLOGY_TELECOM_KEYWORDS, 
  HEALTHCARE_KEYWORDS, 
  PAYROLL_SERVICE_KEYWORDS, 
  AUTOMOTIVE_KEYWORDS 
} from './utilityKeywords';
import { mergeKeywordArrays } from './keywordUtils';

/**
 * Comprehensive exclusion keywords - combines all category-specific keywords
 * This is the main export that existing code expects
 */
export const COMPREHENSIVE_EXCLUSION_KEYWORDS = mergeKeywordArrays(
  BUSINESS_KEYWORDS,
  FINANCIAL_KEYWORDS,
  GOVERNMENT_KEYWORDS,
  UTILITY_KEYWORDS,
  TECHNOLOGY_TELECOM_KEYWORDS,
  HEALTHCARE_KEYWORDS,
  PAYROLL_SERVICE_KEYWORDS,
  AUTOMOTIVE_KEYWORDS
);
