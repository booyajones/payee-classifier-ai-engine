import { DuplicateDetectionOutput } from '../duplicateDetectionTypes';

/**
 * Statistics generation utilities for duplicate detection
 */

/**
 * Generate processing statistics
 */
export function generateStatistics(processedRecords: DuplicateDetectionOutput[], processingTime: number) {
  const duplicates = processedRecords.filter(r => r.is_potential_duplicate);
  const highConfidence = processedRecords.filter(r => r.judgement_method === 'Algorithmic - High Confidence');
  const lowConfidence = processedRecords.filter(r => r.judgement_method === 'Algorithmic - Low Confidence');
  const aiJudgments = processedRecords.filter(r => r.judgement_method === 'AI Judgment');

  return {
    total_processed: processedRecords.length,
    duplicates_found: duplicates.length,
    high_confidence_matches: highConfidence.length,
    low_confidence_matches: lowConfidence.length,
    ai_judgments_made: aiJudgments.length,
    processing_time_ms: processingTime
  };
}