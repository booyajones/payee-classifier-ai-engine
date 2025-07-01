
import { DataStandardizationResult } from './types';

/**
 * Comprehensive name standardization function
 * Handles all common data quality issues found in payee names
 */
export function standardizePayeeName(originalName: string | null | undefined): DataStandardizationResult {
  const cleaningSteps: string[] = [];
  
  // Handle null/undefined/empty cases
  if (!originalName || typeof originalName !== 'string') {
    return {
      original: originalName?.toString() || '',
      normalized: 'UNKNOWN',
      cleaningSteps: ['handled_null_or_empty']
    };
  }

  let normalized = originalName;
  
  // Step 1: Basic whitespace and formatting cleanup
  normalized = normalized.trim();
  if (normalized !== originalName.trim()) cleaningSteps.push('trimmed_whitespace');
  
  // Remove multiple spaces, tabs, line breaks
  const beforeSpaces = normalized;
  normalized = normalized.replace(/\s+/g, ' ');
  if (normalized !== beforeSpaces) cleaningSteps.push('normalized_spaces');
  
  // Step 2: Remove common punctuation and special characters
  const beforePunctuation = normalized;
  normalized = normalized.replace(/[.,;:!?\[\]{}()"`~@#$%^&*+=|\\/<>]/g, ' ');
  if (normalized !== beforePunctuation) cleaningSteps.push('removed_punctuation');
  
  // Step 3: Handle apostrophes and hyphens (common in names)
  const beforeApostrophes = normalized;
  normalized = normalized.replace(/[''`]/g, ''); // Remove apostrophes
  normalized = normalized.replace(/[-–—]/g, ' '); // Replace hyphens with spaces
  if (normalized !== beforeApostrophes) cleaningSteps.push('handled_apostrophes_hyphens');
  
  // Step 4: Remove numbers and numeric suffixes
  const beforeNumbers = normalized;
  normalized = normalized.replace(/\b\d+\b/g, ''); // Remove standalone numbers
  normalized = normalized.replace(/\b(1ST|2ND|3RD|\d+TH)\b/gi, ''); // Remove ordinal numbers
  if (normalized !== beforeNumbers) cleaningSteps.push('removed_numbers');
  
  // Step 5: Remove business entity suffixes
  const beforeBusinessSuffixes = normalized;
  const businessSuffixes = [
    'LLC', 'LLP', 'LP', 'LLLP', 'INC', 'INCORPORATED', 'CORP', 'CORPORATION',
    'CO', 'COMPANY', 'LTD', 'LIMITED', 'PC', 'PLLC', 'PA', 'PROFESSIONAL ASSOCIATION',
    'CHARTERED', 'PLC', 'HOLDING', 'HOLDINGS', 'GROUP', 'ENTERPRISES', 'ENTERPRISE'
  ];
  const businessPattern = new RegExp(`\\b(${businessSuffixes.join('|')})\\b\\.?$`, 'gi');
  normalized = normalized.replace(businessPattern, '');
  if (normalized !== beforeBusinessSuffixes) cleaningSteps.push('removed_business_suffixes');
  
  // Step 6: Remove address components
  const beforeAddressTerms = normalized;
  const addressTerms = [
    'STREET', 'ST', 'AVENUE', 'AVE', 'BOULEVARD', 'BLVD', 'DRIVE', 'DR',
    'ROAD', 'RD', 'LANE', 'LN', 'COURT', 'CT', 'CIRCLE', 'CIR',
    'PLACE', 'PL', 'SQUARE', 'SQ', 'NORTH', 'SOUTH', 'EAST', 'WEST',
    'N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW', 'SUITE', 'STE', 'UNIT'
  ];
  const addressPattern = new RegExp(`\\b(${addressTerms.join('|')})\\b\\.?`, 'gi');
  normalized = normalized.replace(addressPattern, '');
  if (normalized !== beforeAddressTerms) cleaningSteps.push('removed_address_terms');
  
  // Step 7: Remove titles and prefixes
  const beforeTitles = normalized;
  const titles = [
    'MR', 'MRS', 'MS', 'MISS', 'DR', 'DOCTOR', 'PROF', 'PROFESSOR',
    'REV', 'REVEREND', 'HON', 'HONORABLE', 'SIR', 'MADAM', 'MADAME'
  ];
  const titlePattern = new RegExp(`^(${titles.join('|')})\\.?\\s+`, 'gi');
  normalized = normalized.replace(titlePattern, '');
  if (normalized !== beforeTitles) cleaningSteps.push('removed_titles');
  
  // Step 8: Remove generational suffixes
  const beforeGenerational = normalized;
  const generationalSuffixes = ['JR', 'SR', 'II', 'III', 'IV', 'V', 'JUNIOR', 'SENIOR'];
  const generationalPattern = new RegExp(`\\b(${generationalSuffixes.join('|')})\\.?$`, 'gi');
  normalized = normalized.replace(generationalPattern, '');
  if (normalized !== beforeGenerational) cleaningSteps.push('removed_generational_suffixes');
  
  // Step 9: Remove common business words at the beginning
  const beforeBusinessWords = normalized;
  const businessWords = ['THE', 'A', 'AN'];
  const businessWordPattern = new RegExp(`^(${businessWords.join('|')})\\s+`, 'gi');
  normalized = normalized.replace(businessWordPattern, '');
  if (normalized !== beforeBusinessWords) cleaningSteps.push('removed_leading_articles');
  
  // Step 10: Handle email addresses (extract company name part)
  const beforeEmail = normalized;
  const emailMatch = normalized.match(/@([^.\s]+)/);
  if (emailMatch) {
    normalized = emailMatch[1]; // Extract company name from email
    cleaningSteps.push('extracted_from_email');
  } else {
    // Remove email addresses if they don't seem to be the main identifier
    normalized = normalized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '');
    if (normalized !== beforeEmail) cleaningSteps.push('removed_email_addresses');
  }
  
  // Step 11: Remove phone numbers
  const beforePhone = normalized;
  normalized = normalized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, ''); // US phone format
  normalized = normalized.replace(/\(\d{3}\)\s?\d{3}[-.]?\d{4}/g, ''); // (123) 456-7890 format
  if (normalized !== beforePhone) cleaningSteps.push('removed_phone_numbers');
  
  // Step 12: Normalize foreign characters and accents
  const beforeAccents = normalized;
  normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (normalized !== beforeAccents) cleaningSteps.push('normalized_accents');
  
  // Step 13: Expand common abbreviations
  const beforeAbbreviations = normalized;
  const abbreviations = {
    'CORP': 'CORPORATION',
    'CO': 'COMPANY', 
    'ASSOC': 'ASSOCIATION',
    'ASSN': 'ASSOCIATION',
    'INTL': 'INTERNATIONAL',
    'NATL': 'NATIONAL',
    'FED': 'FEDERAL',
    'GOVT': 'GOVERNMENT',
    'DEPT': 'DEPARTMENT',
    'MGMT': 'MANAGEMENT',
    'SVCS': 'SERVICES',
    'TECH': 'TECHNOLOGY',
    'MFG': 'MANUFACTURING'
  };
  
  Object.entries(abbreviations).forEach(([abbr, full]) => {
    const pattern = new RegExp(`\\b${abbr}\\b`, 'gi');
    if (pattern.test(normalized)) {
      normalized = normalized.replace(pattern, full);
      cleaningSteps.push(`expanded_${abbr.toLowerCase()}_abbreviation`);
    }
  });
  
  // Step 14: Final cleanup
  normalized = normalized.replace(/\s+/g, ' '); // Remove extra spaces again
  normalized = normalized.trim(); // Final trim
  
  // Step 15: Convert to consistent case (Title Case)
  const beforeCase = normalized;
  normalized = normalized.toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  if (normalized !== beforeCase) cleaningSteps.push('applied_title_case');
  
  // Step 16: Handle edge cases
  if (normalized === '' || normalized.length < 1) {
    normalized = 'UNKNOWN';
    cleaningSteps.push('fallback_to_unknown');
  }
  
  return {
    original: originalName,
    normalized: normalized,
    cleaningSteps: cleaningSteps
  };
}
