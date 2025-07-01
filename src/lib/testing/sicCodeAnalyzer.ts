
import { PayeeClassification } from '../types';
import { loadAllClassificationResults } from '../database/classificationService';

/**
 * SIC Code Analysis and Reporting Tools
 */

export interface SICAnalysisReport {
  timestamp: Date;
  dataSource: string;
  totalRecords: number;
  businessRecords: number;
  individualRecords: number;
  sicCodeCoverage: {
    count: number;
    percentage: number;
    missingCount: number;
  };
  sicCodeDistribution: {
    code: string;
    description?: string;
    count: number;
    percentage: number;
  }[];
  industryBreakdown: {
    industry: string;
    count: number;
    percentage: number;
  }[];
  qualityMetrics: {
    validSicCodes: number;
    invalidSicCodes: number;
    duplicateSicCodes: number;
    avgConfidence: number;
  };
  recommendations: string[];
}

/**
 * Analyze SIC codes in database
 */
export async function analyzeDatabaseSICCodes(): Promise<SICAnalysisReport> {
  const results = await loadAllClassificationResults();
  return analyzeSICCodes(results, 'Database');
}

/**
 * Analyze SIC codes in a result set
 */
export function analyzeSICCodes(results: PayeeClassification[], dataSource: string = 'Memory'): SICAnalysisReport {
  const businesses = results.filter(r => r.result.classification === 'Business');
  const individuals = results.filter(r => r.result.classification === 'Individual');
  const withSicCodes = businesses.filter(r => r.result.sicCode);
  
  // SIC Code Distribution
  const sicCodeMap = new Map<string, { count: number; description?: string }>();
  withSicCodes.forEach(result => {
    if (result.result.sicCode) {
      const existing = sicCodeMap.get(result.result.sicCode) || { count: 0 };
      sicCodeMap.set(result.result.sicCode, {
        count: existing.count + 1,
        description: existing.description || result.result.sicDescription
      });
    }
  });

  const sicCodeDistribution = Array.from(sicCodeMap.entries())
    .map(([code, data]) => ({
      code,
      description: data.description,
      count: data.count,
      percentage: Math.round((data.count / withSicCodes.length) * 100)
    }))
    .sort((a, b) => b.count - a.count);

  // Industry Breakdown (based on SIC major groups)
  const industryMap = new Map<string, number>();
  withSicCodes.forEach(result => {
    if (result.result.sicCode) {
      const industry = getIndustryFromSIC(result.result.sicCode);
      industryMap.set(industry, (industryMap.get(industry) || 0) + 1);
    }
  });

  const industryBreakdown = Array.from(industryMap.entries())
    .map(([industry, count]) => ({
      industry,
      count,
      percentage: Math.round((count / withSicCodes.length) * 100)
    }))
    .sort((a, b) => b.count - a.count);

  // Quality Metrics
  const validSicCodes = withSicCodes.filter(r => 
    r.result.sicCode && /^\d{2,4}$/.test(r.result.sicCode)
  ).length;
  
  const duplicateSicCodes = withSicCodes.length - sicCodeMap.size;
  
  const avgConfidence = businesses.length > 0 
    ? Math.round(businesses.reduce((sum, r) => sum + r.result.confidence, 0) / businesses.length)
    : 0;

  // Generate Recommendations
  const recommendations: string[] = [];
  const sicCoverage = businesses.length > 0 ? Math.round((withSicCodes.length / businesses.length) * 100) : 0;
  
  if (sicCoverage < 80) {
    recommendations.push(`Improve SIC code coverage (currently ${sicCoverage}%)`);
  }
  
  if (validSicCodes < withSicCodes.length) {
    recommendations.push(`Fix ${withSicCodes.length - validSicCodes} invalid SIC code formats`);
  }
  
  if (avgConfidence < 70) {
    recommendations.push(`Review low-confidence classifications (avg: ${avgConfidence}%)`);
  }
  
  if (duplicateSicCodes > withSicCodes.length * 0.3) {
    recommendations.push('High duplicate SIC codes detected - consider more specific classifications');
  }

  return {
    timestamp: new Date(),
    dataSource,
    totalRecords: results.length,
    businessRecords: businesses.length,
    individualRecords: individuals.length,
    sicCodeCoverage: {
      count: withSicCodes.length,
      percentage: sicCoverage,
      missingCount: businesses.length - withSicCodes.length
    },
    sicCodeDistribution,
    industryBreakdown,
    qualityMetrics: {
      validSicCodes,
      invalidSicCodes: withSicCodes.length - validSicCodes,
      duplicateSicCodes,
      avgConfidence
    },
    recommendations
  };
}

/**
 * Get industry name from SIC code
 */
function getIndustryFromSIC(sicCode: string): string {
  const code = parseInt(sicCode);
  
  if (code >= 100 && code <= 999) return 'Agriculture, Forestry, Fishing';
  if (code >= 1000 && code <= 1499) return 'Mining';
  if (code >= 1500 && code <= 1799) return 'Construction';
  if (code >= 2000 && code <= 3999) return 'Manufacturing';
  if (code >= 4000 && code <= 4999) return 'Transportation & Utilities';
  if (code >= 5000 && code <= 5199) return 'Wholesale Trade';
  if (code >= 5200 && code <= 5999) return 'Retail Trade';
  if (code >= 6000 && code <= 6799) return 'Finance & Insurance';
  if (code >= 7000 && code <= 8999) return 'Services';
  if (code >= 9000 && code <= 9999) return 'Public Administration';
  
  return 'Unknown/Other';
}

/**
 * Generate SIC code quality report
 */
export function generateSICQualityReport(results: PayeeClassification[]): {
  totalBusinesses: number;
  withSicCodes: number;
  withoutSicCodes: number;
  coverage: number;
  qualityIssues: {
    type: string;
    count: number;
    examples: string[];
  }[];
} {
  const businesses = results.filter(r => r.result.classification === 'Business');
  const withSicCodes = businesses.filter(r => r.result.sicCode);
  const withoutSicCodes = businesses.filter(r => !r.result.sicCode);
  
  const qualityIssues: { type: string; count: number; examples: string[] }[] = [];
  
  // Check for invalid formats
  const invalidFormats = withSicCodes.filter(r => 
    !r.result.sicCode || !/^\d{2,4}$/.test(r.result.sicCode)
  );
  if (invalidFormats.length > 0) {
    qualityIssues.push({
      type: 'Invalid SIC Code Format',
      count: invalidFormats.length,
      examples: invalidFormats.slice(0, 3).map(r => `${r.payeeName}: ${r.result.sicCode}`)
    });
  }
  
  // Check for missing descriptions
  const missingDescriptions = withSicCodes.filter(r => 
    r.result.sicCode && !r.result.sicDescription
  );
  if (missingDescriptions.length > 0) {
    qualityIssues.push({
      type: 'Missing SIC Descriptions',
      count: missingDescriptions.length,
      examples: missingDescriptions.slice(0, 3).map(r => `${r.payeeName}: ${r.result.sicCode}`)
    });
  }
  
  return {
    totalBusinesses: businesses.length,
    withSicCodes: withSicCodes.length,
    withoutSicCodes: withoutSicCodes.length,
    coverage: businesses.length > 0 ? Math.round((withSicCodes.length / businesses.length) * 100) : 0,
    qualityIssues
  };
}
