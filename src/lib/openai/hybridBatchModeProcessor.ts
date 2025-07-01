
import { ClassificationConfig } from '@/lib/types';
import { createBatchJob, getBatchJobResults } from './trueBatchAPI';
import { optimizedBatchClassification } from './optimizedBatchClassification';
import { applyKeywordExclusions } from './hybridKeywordProcessor';
import { HybridBatchResult, BatchStats, ProgressCallback } from './hybridBatchTypes';

/**
 * Process payees using either real-time or batch mode
 */
export async function processWithHybridBatch(
  payeeNames: string[],
  mode: 'realtime' | 'batch',
  onProgress?: ProgressCallback,
  config?: ClassificationConfig
): Promise<HybridBatchResult> {
  console.log(`[HYBRID BATCH] Starting ${mode} processing for ${payeeNames.length} payees`);
  console.log(`[HYBRID BATCH] Sample payees:`, payeeNames.slice(0, 5));
  
  const stats: BatchStats = {
    keywordExcluded: 0,
    aiProcessed: 0,
    phase: 'Initializing'
  };

  // Step 1: Apply keyword exclusions - ALWAYS ENABLED
  stats.phase = 'Applying keyword exclusions (ALWAYS ENABLED)';
  onProgress?.(0, payeeNames.length, 0, stats);

  const exclusionResults = await applyKeywordExclusions(payeeNames);
  
  // Separate excluded vs. needs AI processing
  const needsAI: { name: string; index: number }[] = [];
  const finalResults: Array<{
    classification: 'Business' | 'Individual';
    confidence: number;
    reasoning: string;
    processingTier: 'Rule-Based' | 'AI-Powered' | 'Failed' | 'NLP-Based' | 'AI-Assisted' | 'Excluded';
  } | null> = payeeNames.map((name, index) => {
    const exclusionResult = exclusionResults[index];
    if (exclusionResult.isExcluded) {
      stats.keywordExcluded++;
      return {
        classification: 'Business' as const,
        confidence: exclusionResult.confidence,
        reasoning: exclusionResult.reasoning,
        processingTier: 'Excluded' as const
      };
    } else {
      needsAI.push({ name, index });
      return null; // Placeholder
    }
  });

  console.log(`[HYBRID BATCH] Keyword exclusions: ${stats.keywordExcluded}, Need AI: ${needsAI.length}`);

  if (needsAI.length === 0) {
    // All were excluded by keywords
    stats.phase = 'Complete - All keyword excluded';
    onProgress?.(payeeNames.length, payeeNames.length, 100, stats);
    return {
      results: finalResults.filter(r => r !== null) as HybridBatchResult['results']
    };
  }

  const aiNames = needsAI.map(item => item.name);

  if (mode === 'batch') {
    // Submit to OpenAI Batch API
    stats.phase = 'Submitting batch job (after keyword exclusion)';
    onProgress?.(stats.keywordExcluded, payeeNames.length, (stats.keywordExcluded / payeeNames.length) * 100, stats);

    try {
      console.log(`[HYBRID BATCH] Creating batch job for ${aiNames.length} names (${stats.keywordExcluded} excluded)`);
      const batchJob = await createBatchJob(aiNames, `Hybrid classification batch - ${aiNames.length} payees`);
      console.log(`[HYBRID BATCH] Created batch job:`, batchJob);
      
      stats.phase = 'Batch job submitted';
      stats.aiProcessed = aiNames.length;
      onProgress?.(payeeNames.length, payeeNames.length, 100, stats);

      return {
        results: [], // Results will come later via polling
        batchJob,
        stats
      };
    } catch (error) {
      console.error('[HYBRID BATCH] Error creating batch job:', error);
      throw new Error(`Failed to create batch job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    // Real-time processing
    stats.phase = 'Processing with AI (real-time, after keyword exclusion)';
    
    try {
      const aiResults = await optimizedBatchClassification(
        aiNames,
        30000 // timeout
      );

      console.log(`[HYBRID BATCH] AI processing complete. Results:`, aiResults);

      // Merge AI results back into final results
      needsAI.forEach((item, aiIndex) => {
        const aiResult = aiResults[aiIndex];
        finalResults[item.index] = {
          classification: aiResult?.classification || 'Individual',
          confidence: aiResult?.confidence || 0,
          reasoning: aiResult?.reasoning || 'AI classification failed',
          processingTier: 'AI-Powered' as const
        };
      });

      stats.phase = 'Complete';
      stats.aiProcessed = aiNames.length;
      onProgress?.(payeeNames.length, payeeNames.length, 100, stats);

      return {
        results: finalResults.filter(r => r !== null) as HybridBatchResult['results'],
        stats
      };
    } catch (error) {
      console.error('[HYBRID BATCH] Error in real-time processing:', error);
      throw new Error(`Real-time processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
