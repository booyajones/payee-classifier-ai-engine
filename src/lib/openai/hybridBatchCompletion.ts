
import { BatchJob, getBatchJobResults } from './trueBatchAPI';
import { applyKeywordExclusions } from './hybridKeywordProcessor';
import { HybridBatchResult } from './hybridBatchTypes';

/**
 * Complete a batch job by retrieving and processing results
 */
export async function completeBatchJob(
  batchJob: BatchJob,
  originalPayeeNames: string[]
): Promise<HybridBatchResult> {
  console.log(`[HYBRID BATCH] Completing batch job ${batchJob.id} for ${originalPayeeNames.length} payees`);
  
  // Re-apply keyword exclusions to get the same filtering - ALWAYS ENABLED
  const exclusionResults = await applyKeywordExclusions(originalPayeeNames);
  const needsAI: { name: string; index: number }[] = [];
  const finalResults: Array<{
    classification: 'Business' | 'Individual';
    confidence: number;
    reasoning: string;
    processingTier: 'Rule-Based' | 'AI-Powered' | 'Failed' | 'NLP-Based' | 'AI-Assisted' | 'Excluded';
  } | null> = originalPayeeNames.map((name, index) => {
    const exclusionResult = exclusionResults[index];
    if (exclusionResult.isExcluded) {
      return {
        classification: 'Business' as const,
        confidence: exclusionResult.confidence,
        reasoning: exclusionResult.reasoning,
        processingTier: 'Excluded' as const
      };
    } else {
      needsAI.push({ name, index });
      return null;
    }
  });

  if (needsAI.length === 0) {
    return {
      results: finalResults.filter(r => r !== null) as HybridBatchResult['results']
    };
  }

  const aiNames = needsAI.map(item => item.name);
  
  try {
    console.log(`[HYBRID BATCH] Retrieving batch results for ${aiNames.length} AI-processed names`);
    const batchResults = await getBatchJobResults(batchJob, aiNames);
    
    // Merge batch results back into final results
    needsAI.forEach((item, aiIndex) => {
      const batchResult = batchResults[aiIndex];
      finalResults[item.index] = {
        classification: batchResult?.classification || 'Individual',
        confidence: batchResult?.confidence || 0,
        reasoning: batchResult?.reasoning || 'Batch processing failed',
        processingTier: batchResult?.status === 'success' ? 'AI-Powered' as const : 'Failed' as const
      };
    });

    console.log(`[HYBRID BATCH] Batch job completion successful`);

    return {
      results: finalResults.filter(r => r !== null) as HybridBatchResult['results'],
      stats: {
        keywordExcluded: originalPayeeNames.length - needsAI.length,
        aiProcessed: needsAI.length,
        phase: 'Complete'
      }
    };
  } catch (error) {
    console.error('[HYBRID BATCH] Error completing batch job:', error);
    throw new Error(`Failed to complete batch job: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
