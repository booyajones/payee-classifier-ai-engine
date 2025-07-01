
// Basic exclusion keywords for testing and fallback scenarios
export const DEFAULT_EXCLUSION_KEYWORDS = [
  'test', 'sample', 'example', 'dummy', 'placeholder', 'temp', 'temporary',
  'unknown', 'na', 'null', 'undefined', 'blank', 'empty', 'void',
  'pending', 'processing', 'error', 'failed', 'invalid', 'debug'
];

// Emergency fallback keywords if comprehensive list fails to load
export const EMERGENCY_FALLBACK_KEYWORDS = [
  'BANK', 'INSURANCE', 'GOVERNMENT', 'DEPARTMENT', 'AGENCY', 'AUTHORITY',
  'COMMISSION', 'BUREAU', 'OFFICE', 'ADMINISTRATION', 'FEDERAL', 'STATE',
  'COUNTY', 'CITY', 'MUNICIPAL', 'PUBLIC', 'UTILITIES', 'ELECTRIC',
  'GAS', 'WATER', 'ENERGY', 'POWER', 'CREDIT UNION', 'FINANCIAL',
  'TRUST', 'INVESTMENT', 'MORTGAGE', 'LOAN', 'CREDIT', 'PAYROLL'
];
