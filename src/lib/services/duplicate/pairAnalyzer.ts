import { calculateDuplicateScore } from '@/lib/classification/stringMatching';
import { isSameEntity } from '@/lib/classification/enhancedNormalization';
import { DuplicateDetectionInput, DuplicatePair, DuplicateDetectionConfig } from '../duplicateDetectionTypes';

/**
 * Pair analysis logic for duplicate detection
 */

/**
 * Find potential duplicate pairs using algorithmic analysis
 */
export function findDuplicatePairs(
  cleanedRecords: Array<DuplicateDetectionInput & { cleaned_name: string }>,
  config: DuplicateDetectionConfig
): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];

  for (let i = 0; i < cleanedRecords.length; i++) {
    for (let j = i + 1; j < cleanedRecords.length; j++) {
      const record1 = cleanedRecords[i];
      const record2 = cleanedRecords[j];

      // First check if they're obviously the same entity
      const obviousDuplicate = isSameEntity(record1.payee_name, record2.payee_name);
      
      // Calculate similarity using the official duplicate detection formula
      const similarity_scores = calculateDuplicateScore(record1.cleaned_name, record2.cleaned_name);
      let final_duplicate_score = similarity_scores.duplicateScore;
      
      // Boost score for obvious duplicates (like "Christa INC" vs "CHRISTA")
      if (obviousDuplicate) {
        final_duplicate_score = Math.max(final_duplicate_score, 95);
        console.log(`[PAIR ANALYZER] ✅ OBVIOUS DUPLICATE DETECTED: "${record1.payee_name}" vs "${record2.payee_name}" - boosted to ${final_duplicate_score}%`);
      }

      // Determine confidence tier
      let confidence_tier: 'High' | 'Low' | 'Ambiguous';
      if (final_duplicate_score >= config.highConfidenceThreshold) {
        confidence_tier = 'High';
      } else if (final_duplicate_score <= config.lowConfidenceThreshold) {
        confidence_tier = 'Low';
      } else {
        confidence_tier = 'Ambiguous';
      }

      // Only include pairs that could be duplicates (exclude very low scores)
      if (final_duplicate_score > config.lowConfidenceThreshold || confidence_tier === 'Ambiguous') {
        pairs.push({
          record1: { payee_id: record1.payee_id, payee_name: record1.payee_name },
          record2: { payee_id: record2.payee_id, payee_name: record2.payee_name },
          similarity_scores,
          final_duplicate_score,
          confidence_tier
        });
      }
    }
  }

  return pairs;
}