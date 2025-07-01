
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
import { 
  DEFAULT_EXCLUSION_KEYWORDS, 
  EMERGENCY_FALLBACK_KEYWORDS 
} from './basicExclusionKeywords';

/**
 * Validation result for exclusion keywords
 */
export interface KeywordValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate exclusion keywords array
 */
export function validateExclusionKeywords(keywords: string[]): KeywordValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!Array.isArray(keywords)) {
    errors.push('Keywords must be an array');
    return { isValid: false, errors, warnings };
  }
  
  if (keywords.length === 0) {
    warnings.push('No exclusion keywords provided');
  }
  
  const duplicates = keywords.filter((item, index) => keywords.indexOf(item) !== index);
  if (duplicates.length > 0) {
    warnings.push(`Duplicate keywords found: ${duplicates.join(', ')}`);
  }
  
  const emptyKeywords = keywords.filter(k => !k || typeof k !== 'string' || k.trim() === '');
  if (emptyKeywords.length > 0) {
    errors.push(`${emptyKeywords.length} empty or invalid keywords found`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get keyword statistics for analysis
 */
export function getKeywordStatistics(keywords: string[]) {
  const stats = {
    total: keywords.length,
    byCategory: {
      business: 0,
      financial: 0,
      government: 0,
      utility: 0,
      technology: 0,
      healthcare: 0,
      payroll: 0,
      automotive: 0,
      other: 0
    },
    averageLength: 0,
    longest: '',
    shortest: '',
    duplicates: 0
  };

  if (keywords.length === 0) return stats;

  // Calculate averages and extremes
  const lengths = keywords.map(k => k.length);
  stats.averageLength = Math.round(lengths.reduce((sum, len) => sum + len, 0) / lengths.length);
  stats.longest = keywords.reduce((longest, current) => 
    current.length > longest.length ? current : longest
  );
  stats.shortest = keywords.reduce((shortest, current) => 
    current.length < shortest.length ? current : shortest
  );

  // Count duplicates
  const uniqueKeywords = new Set(keywords);
  stats.duplicates = keywords.length - uniqueKeywords.size;

  // Categorize keywords
  keywords.forEach(keyword => {
    const upperKeyword = keyword.toUpperCase();
    
    if (BUSINESS_KEYWORDS.some(k => k.toUpperCase() === upperKeyword)) {
      stats.byCategory.business++;
    } else if (FINANCIAL_KEYWORDS.some(k => k.toUpperCase() === upperKeyword)) {
      stats.byCategory.financial++;
    } else if (GOVERNMENT_KEYWORDS.some(k => k.toUpperCase() === upperKeyword)) {
      stats.byCategory.government++;
    } else if (UTILITY_KEYWORDS.some(k => k.toUpperCase() === upperKeyword)) {
      stats.byCategory.utility++;
    } else if (TECHNOLOGY_TELECOM_KEYWORDS.some(k => k.toUpperCase() === upperKeyword)) {
      stats.byCategory.technology++;
    } else if (HEALTHCARE_KEYWORDS.some(k => k.toUpperCase() === upperKeyword)) {
      stats.byCategory.healthcare++;
    } else if (PAYROLL_SERVICE_KEYWORDS.some(k => k.toUpperCase() === upperKeyword)) {
      stats.byCategory.payroll++;
    } else if (AUTOMOTIVE_KEYWORDS.some(k => k.toUpperCase() === upperKeyword)) {
      stats.byCategory.automotive++;
    } else {
      stats.byCategory.other++;
    }
  });

  return stats;
}

/**
 * Merge and deduplicate keyword arrays
 */
export function mergeKeywordArrays(...arrays: string[][]): string[] {
  const merged = arrays.flat();
  const unique = [...new Set(merged.map(k => k.trim()).filter(k => k.length > 0))];
  return unique.sort();
}

/**
 * Search keywords by partial match
 */
export function searchKeywords(keywords: string[], searchTerm: string): string[] {
  if (!searchTerm || searchTerm.trim() === '') return keywords;
  
  const term = searchTerm.toLowerCase().trim();
  return keywords.filter(keyword => 
    keyword.toLowerCase().includes(term)
  );
}

/**
 * Get keywords by category
 */
export function getKeywordsByCategory(category: string): string[] {
  switch (category.toLowerCase()) {
    case 'business':
      return [...BUSINESS_KEYWORDS];
    case 'financial':
      return [...FINANCIAL_KEYWORDS];
    case 'government':
      return [...GOVERNMENT_KEYWORDS];
    case 'utility':
      return [...UTILITY_KEYWORDS];
    case 'technology':
    case 'telecom':
      return [...TECHNOLOGY_TELECOM_KEYWORDS];
    case 'healthcare':
      return [...HEALTHCARE_KEYWORDS];
    case 'payroll':
      return [...PAYROLL_SERVICE_KEYWORDS];
    case 'automotive':
      return [...AUTOMOTIVE_KEYWORDS];
    case 'default':
      return [...DEFAULT_EXCLUSION_KEYWORDS];
    case 'emergency':
      return [...EMERGENCY_FALLBACK_KEYWORDS];
    default:
      return [];
  }
}
