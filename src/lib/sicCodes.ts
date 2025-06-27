
/**
 * SIC Code reference and validation service
 * Standard Industrial Classification codes for business classification
 */

export interface SicCodeInfo {
  code: string;
  description: string;
  category: string;
}

// Common SIC codes for reference and validation
export const COMMON_SIC_CODES: Record<string, SicCodeInfo> = {
  // Agriculture, Forestry & Fishing
  '0111': { code: '0111', description: 'Wheat', category: 'Agriculture' },
  '0181': { code: '0181', description: 'Ornamental Floriculture and Nursery Products', category: 'Agriculture' },
  
  // Construction
  '1521': { code: '1521', description: 'General Building Contractors-Single-Family Houses', category: 'Construction' },
  '1522': { code: '1522', description: 'General Building Contractors-Residential Buildings, Other Than Single-Family', category: 'Construction' },
  '1541': { code: '1541', description: 'General Contractors-Industrial Buildings and Warehouses', category: 'Construction' },
  '1542': { code: '1542', description: 'General Contractors-Nonresidential Buildings, Other Than Industrial Buildings and Warehouses', category: 'Construction' },
  
  // Manufacturing
  '2011': { code: '2011', description: 'Meat Packing Plants', category: 'Manufacturing' },
  '2834': { code: '2834', description: 'Pharmaceutical Preparations', category: 'Manufacturing' },
  '3571': { code: '3571', description: 'Electronic Computers', category: 'Manufacturing' },
  
  // Transportation & Public Utilities
  '4213': { code: '4213', description: 'Trucking, Except Local', category: 'Transportation' },
  '4812': { code: '4812', description: 'Radiotelephone Communications', category: 'Communications' },
  
  // Wholesale Trade
  '5045': { code: '5045', description: 'Computers and Computer Peripheral Equipment and Software', category: 'Wholesale' },
  '5122': { code: '5122', description: 'Drugs, Drug Proprietaries, and Druggists\' Sundries', category: 'Wholesale' },
  
  // Retail Trade
  '5311': { code: '5311', description: 'Department Stores', category: 'Retail' },
  '5411': { code: '5411', description: 'Grocery Stores', category: 'Retail' },
  '5541': { code: '5541', description: 'Gasoline Service Stations', category: 'Retail' },
  '5812': { code: '5812', description: 'Eating Places', category: 'Retail' },
  
  // Finance, Insurance & Real Estate
  '6021': { code: '6021', description: 'National Commercial Banks', category: 'Finance' },
  '6311': { code: '6311', description: 'Life Insurance', category: 'Insurance' },
  '6531': { code: '6531', description: 'Real Estate Agents and Managers', category: 'Real Estate' },
  
  // Services
  '7011': { code: '7011', description: 'Hotels and Motels', category: 'Services' },
  '7372': { code: '7372', description: 'Prepackaged Software', category: 'Services' },
  '7389': { code: '7389', description: 'Business Services, NEC', category: 'Services' },
  '8011': { code: '8011', description: 'Offices of Doctors of Medicine', category: 'Healthcare' },
  '8021': { code: '8021', description: 'Offices of Dentists', category: 'Healthcare' },
  '8111': { code: '8111', description: 'Legal Services', category: 'Professional Services' },
  '8721': { code: '8721', description: 'Accounting, Auditing, and Bookkeeping Services', category: 'Professional Services' },
  
  // Government
  '9199': { code: '9199', description: 'General Government, NEC', category: 'Government' },
  '9211': { code: '9211', description: 'Courts', category: 'Government' },
  '9311': { code: '9311', description: 'Public Finance, Taxation, and Monetary Policy', category: 'Government' },
};

/**
 * Validate a SIC code format
 */
export function isValidSicCode(code: string): boolean {
  return /^\d{4}$/.test(code);
}

/**
 * Get SIC code information
 */
export function getSicCodeInfo(code: string): SicCodeInfo | null {
  if (!isValidSicCode(code)) {
    return null;
  }
  
  return COMMON_SIC_CODES[code] || null;
}

/**
 * Get default/fallback SIC codes for common business types
 */
export function getDefaultSicCode(businessType?: string): SicCodeInfo {
  const lowerType = businessType?.toLowerCase() || '';
  
  if (lowerType.includes('government') || lowerType.includes('city') || lowerType.includes('county') || lowerType.includes('state')) {
    return COMMON_SIC_CODES['9199'];
  }
  
  if (lowerType.includes('doctor') || lowerType.includes('physician') || lowerType.includes('medical')) {
    return COMMON_SIC_CODES['8011'];
  }
  
  if (lowerType.includes('dentist') || lowerType.includes('dental')) {
    return COMMON_SIC_CODES['8021'];
  }
  
  if (lowerType.includes('law') || lowerType.includes('attorney') || lowerType.includes('legal')) {
    return COMMON_SIC_CODES['8111'];
  }
  
  if (lowerType.includes('account') || lowerType.includes('cpa')) {
    return COMMON_SIC_CODES['8721'];
  }
  
  if (lowerType.includes('construction') || lowerType.includes('contractor')) {
    return COMMON_SIC_CODES['1521'];
  }
  
  if (lowerType.includes('restaurant') || lowerType.includes('food')) {
    return COMMON_SIC_CODES['5812'];
  }
  
  if (lowerType.includes('retail') || lowerType.includes('store')) {
    return COMMON_SIC_CODES['5311'];
  }
  
  if (lowerType.includes('software') || lowerType.includes('tech')) {
    return COMMON_SIC_CODES['7372'];
  }
  
  if (lowerType.includes('bank')) {
    return COMMON_SIC_CODES['6021'];
  }
  
  // Default fallback for unclear business types
  return COMMON_SIC_CODES['7389'];
}

/**
 * Search SIC codes by description
 */
export function searchSicCodes(query: string): SicCodeInfo[] {
  const lowerQuery = query.toLowerCase();
  
  return Object.values(COMMON_SIC_CODES).filter(sicInfo =>
    sicInfo.description.toLowerCase().includes(lowerQuery) ||
    sicInfo.category.toLowerCase().includes(lowerQuery)
  );
}
