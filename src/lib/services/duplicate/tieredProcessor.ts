import { duplicateDetectionWithAI } from '@/lib/openai/duplicateDetection';
import { DuplicatePair, DuplicateDetectionConfig } from '../duplicateDetectionTypes';

/**
 * Tiered logic processor for duplicate detection
 */

export interface ProcessedPair extends DuplicatePair {
  is_duplicate: boolean;
  judgement_method: string;
  ai_judgment?: { is_duplicate: boolean; confidence: number; reasoning: string };
}

/**
 * Apply three-tiered logic funnel with AI judgment for ambiguous cases
 */
export async function processWithTieredLogic(
  pairs: DuplicatePair[],
  config: DuplicateDetectionConfig
): Promise<ProcessedPair[]> {
  const processedPairs: ProcessedPair[] = [];

  for (const pair of pairs) {
    if (pair.confidence_tier === 'High') {
      // High confidence: Automatic duplicate
      processedPairs.push({
        ...pair,
        is_duplicate: true,
        judgement_method: 'Algorithmic - High Confidence'
      });
      console.log(`[TIERED PROCESSOR] High confidence duplicate: "${pair.record1.payee_name}" = "${pair.record2.payee_name}" (${pair.final_duplicate_score.toFixed(1)}%)`);

    } else if (pair.confidence_tier === 'Low') {
      // Low confidence: Automatic non-duplicate
      processedPairs.push({
        ...pair,
        is_duplicate: false,
        judgement_method: 'Algorithmic - Low Confidence'
      });

    } else if (pair.confidence_tier === 'Ambiguous' && config.enableAiJudgment) {
      // Ambiguous: Use AI judgment
      console.log(`[TIERED PROCESSOR] Ambiguous case, requesting AI judgment: "${pair.record1.payee_name}" vs "${pair.record2.payee_name}" (${pair.final_duplicate_score.toFixed(1)}%)`);
      
      try {
        const aiJudgment = await duplicateDetectionWithAI(pair.record1.payee_name, pair.record2.payee_name);
        processedPairs.push({
          ...pair,
          is_duplicate: aiJudgment.is_duplicate,
          judgement_method: 'AI Judgment',
          ai_judgment: aiJudgment
        });
        console.log(`[TIERED PROCESSOR] AI judgment: ${aiJudgment.is_duplicate ? 'DUPLICATE' : 'NOT DUPLICATE'} (${aiJudgment.confidence}%) - ${aiJudgment.reasoning}`);

      } catch (error) {
        console.error(`[TIERED PROCESSOR] AI judgment failed, defaulting to non-duplicate:`, error);
        processedPairs.push({
          ...pair,
          is_duplicate: false,
          judgement_method: 'AI Judgment',
          ai_judgment: {
            is_duplicate: false,
            confidence: 50,
            reasoning: `AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        });
      }

    } else {
      // Ambiguous but AI disabled: Default to non-duplicate
      processedPairs.push({
        ...pair,
        is_duplicate: false,
        judgement_method: 'Algorithmic - Low Confidence'
      });
    }
  }

  return processedPairs;
}