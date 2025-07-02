/**
 * AI Quality Configuration - Enforces high-accuracy standards
 * This configuration ensures all AI classifications meet strict quality requirements
 */

export const AI_QUALITY_CONFIG = {
  // MINIMUM CONFIDENCE THRESHOLDS
  MINIMUM_CONFIDENCE: 85, // Reject any classification below 85%
  HIGH_CONFIDENCE_THRESHOLD: 90, // Mark as high-quality above 90%
  RETRY_CONFIDENCE_THRESHOLD: 70, // Retry consensus if below 70%
  
  // RETRY AND CONSENSUS SETTINGS
  MAX_RETRY_ATTEMPTS: 3,
  CONSENSUS_SAMPLE_SIZE: 2, // Number of API calls for consensus
  CONSENSUS_AGREEMENT_THRESHOLD: 0.8, // 80% agreement required
  
  // PROCESSING QUALITY CONTROLS
  REQUIRE_SIC_CODES_FOR_BUSINESS: true,
  VALIDATE_SIC_CODE_FORMAT: true,
  ENABLE_QUALITY_SCORING: true,
  
  // API CONFIGURATION FOR HIGH ACCURACY
  OPENAI_MODEL: 'gpt-4o-mini', // Use most capable model
  TEMPERATURE: 0.1, // Low temperature for consistency
  MAX_TOKENS: 300,
  TIMEOUT: 30000, // 30 second timeout
  
  // QUALITY ASSURANCE FLAGS
  LOG_LOW_CONFIDENCE_RESULTS: true,
  MARK_FOR_MANUAL_REVIEW: true,
  GENERATE_QUALITY_REPORT: true
} as const;

export interface QualityMetrics {
  totalProcessed: number;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  lowConfidenceCount: number;
  averageConfidence: number;
  businessWithSicCodes: number;
  totalBusinesses: number;
  qualityScore: number;
  reviewRequired: number;
}

export function calculateQualityScore(metrics: QualityMetrics): number {
  const confidenceScore = (metrics.highConfidenceCount / metrics.totalProcessed) * 100;
  const sicCodeScore = metrics.totalBusinesses > 0 
    ? (metrics.businessWithSicCodes / metrics.totalBusinesses) * 100 
    : 100;
  
  // Weighted quality score: 70% confidence, 30% SIC code coverage
  return Math.round((confidenceScore * 0.7) + (sicCodeScore * 0.3));
}

export function shouldRequireReview(confidence: number): boolean {
  return confidence < AI_QUALITY_CONFIG.MINIMUM_CONFIDENCE;
}

export function getQualityTier(confidence: number): 'High' | 'Medium' | 'Low' {
  if (confidence >= AI_QUALITY_CONFIG.HIGH_CONFIDENCE_THRESHOLD) return 'High';
  if (confidence >= AI_QUALITY_CONFIG.MINIMUM_CONFIDENCE) return 'Medium';
  return 'Low';
}