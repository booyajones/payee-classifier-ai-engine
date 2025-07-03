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
      
      // Enhanced boost for obvious duplicates
      if (obviousDuplicate) {
        final_duplicate_score = Math.max(final_duplicate_score, 96);
        console.log(`[PAIR ANALYZER] ✅ OBVIOUS DUPLICATE DETECTED: "${record1.payee_name}" vs "${record2.payee_name}" - boosted to ${final_duplicate_score}%`);
      } else {
        // Check for other patterns that should be high confidence
        const name1Lower = record1.payee_name.toLowerCase();
        const name2Lower = record2.payee_name.toLowerCase();
        
        // Case-only differences should be very high confidence
        if (name1Lower === name2Lower && record1.payee_name !== record2.payee_name) {
          final_duplicate_score = Math.max(final_duplicate_score, 98);
          console.log(`[PAIR ANALYZER] ✅ CASE-ONLY DIFFERENCE: "${record1.payee_name}" vs "${record2.payee_name}" - boosted to ${final_duplicate_score}%`);
        }
      }
      
      // DEBUG: Show detailed similarity breakdown
      console.log(`[PAIR ANALYZER] "${record1.payee_name}" vs "${record2.payee_name}": FINAL=${final_duplicate_score.toFixed(1)}% | JW=${similarity_scores.jaroWinkler.toFixed(1)}% | TS=${similarity_scores.tokenSort.toFixed(1)}% | TSe=${similarity_scores.tokenSet.toFixed(1)}% | Obvious=${obviousDuplicate}`);
      

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