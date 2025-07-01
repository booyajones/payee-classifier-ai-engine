
import { PayeeClassification, BatchProcessingResult } from '../types';

/**
 * Comprehensive SIC code validation utilities
 */

export interface SICValidationReport {
  totalResults: number;
  businessCount: number;
  sicCodeCount: number;
  sicCoverage: number;
  missingBusinesses: string[];
  invalidSicCodes: { payee: string; sicCode: string; reason: string }[];
  validationErrors: string[];
  validationWarnings: string[];
}

/**
 * Validate SIC codes in a batch result
 */
export function validateBatchSICCodes(batchResult: BatchProcessingResult): SICValidationReport {
  const report: SICValidationReport = {
    totalResults: batchResult.results.length,
    businessCount: 0,
    sicCodeCount: 0,
    sicCoverage: 0,
    missingBusinesses: [],
    invalidSicCodes: [],
    validationErrors: [],
    validationWarnings: []
  };

  // Analyze each result
  batchResult.results.forEach(result => {
    if (result.result.classification === 'Business') {
      report.businessCount++;
      
      if (result.result.sicCode) {
        report.sicCodeCount++;
        
        // Validate SIC code format
        const sicValidation = validateSICCodeFormat(result.result.sicCode);
        if (!sicValidation.isValid) {
          report.invalidSicCodes.push({
            payee: result.payeeName,
            sicCode: result.result.sicCode,
            reason: sicValidation.error || 'Invalid format'
          });
        }
      } else {
        report.missingBusinesses.push(result.payeeName);
      }
    }
  });

  // Calculate coverage
  report.sicCoverage = report.businessCount > 0 
    ? Math.round((report.sicCodeCount / report.businessCount) * 100) 
    : 0;

  // Generate validation messages
  if (report.sicCoverage < 50 && report.businessCount > 0) {
    report.validationErrors.push(`Low SIC coverage: ${report.sicCoverage}% of businesses have SIC codes`);
  }

  if (report.missingBusinesses.length > 0) {
    report.validationWarnings.push(`${report.missingBusinesses.length} businesses missing SIC codes`);
  }

  if (report.invalidSicCodes.length > 0) {
    report.validationErrors.push(`${report.invalidSicCodes.length} invalid SIC code formats detected`);
  }

  return report;
}

/**
 * Validate SIC code format
 */
export function validateSICCodeFormat(sicCode: string): { isValid: boolean; error?: string } {
  if (!sicCode || typeof sicCode !== 'string') {
    return { isValid: false, error: 'SIC code is empty or not a string' };
  }

  const trimmedCode = sicCode.trim();
  
  if (trimmedCode === '') {
    return { isValid: false, error: 'SIC code is empty' };
  }

  // SIC codes should be 2-4 digits
  if (!/^\d{2,4}$/.test(trimmedCode)) {
    return { isValid: false, error: 'SIC code must be 2-4 digits' };
  }

  // Check for valid SIC code ranges
  const codeNum = parseInt(trimmedCode);
  if (codeNum < 1 || codeNum > 9999) {
    return { isValid: false, error: 'SIC code must be between 1 and 9999' };
  }

  return { isValid: true };
}

/**
 * Generate SIC code statistics for debugging
 */
export function generateSICStatistics(results: PayeeClassification[]): {
  totalResults: number;
  businessCount: number;
  individualCount: number;
  sicCodeCount: number;
  sicCoverage: number;
  topSicCodes: { code: string; count: number; description?: string }[];
  sampleBusinessesWithSic: { payee: string; sicCode: string; sicDescription?: string }[];
  sampleBusinessesWithoutSic: string[];
} {
  const businesses = results.filter(r => r.result.classification === 'Business');
  const individuals = results.filter(r => r.result.classification === 'Individual');
  const withSicCodes = results.filter(r => r.result.sicCode);

  // Count SIC code frequencies
  const sicCodeCounts: Record<string, { count: number; description?: string }> = {};
  withSicCodes.forEach(result => {
    if (result.result.sicCode) {
      const code = result.result.sicCode;
      if (!sicCodeCounts[code]) {
        sicCodeCounts[code] = { count: 0, description: result.result.sicDescription };
      }
      sicCodeCounts[code].count++;
    }
  });

  const topSicCodes = Object.entries(sicCodeCounts)
    .map(([code, data]) => ({ code, count: data.count, description: data.description }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const businessesWithSic = businesses.filter(b => b.result.sicCode);
  const businessesWithoutSic = businesses.filter(b => !b.result.sicCode);

  return {
    totalResults: results.length,
    businessCount: businesses.length,
    individualCount: individuals.length,
    sicCodeCount: withSicCodes.length,
    sicCoverage: businesses.length > 0 ? Math.round((businessesWithSic.length / businesses.length) * 100) : 0,
    topSicCodes,
    sampleBusinessesWithSic: businessesWithSic.slice(0, 5).map(b => ({
      payee: b.payeeName,
      sicCode: b.result.sicCode!,
      sicDescription: b.result.sicDescription
    })),
    sampleBusinessesWithoutSic: businessesWithoutSic.slice(0, 5).map(b => b.payeeName)
  };
}

/**
 * Test SIC code generation for a specific payee name
 */
export async function testSICCodeGeneration(payeeName: string): Promise<{
  success: boolean;
  classification?: string;
  sicCode?: string;
  sicDescription?: string;
  error?: string;
  timing: number;
}> {
  const startTime = Date.now();
  
  try {
    const { classifyPayeeWithAI } = await import('../openai/singleClassification');
    const result = await classifyPayeeWithAI(payeeName);
    
    return {
      success: true,
      classification: result.classification,
      sicCode: result.sicCode,
      sicDescription: result.sicDescription,
      timing: Date.now() - startTime
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timing: Date.now() - startTime
    };
  }
}
