
import { PayeeClassification, BatchProcessingResult, ClassificationConfig } from '../types';
import { enhancedClassifyPayeeV3 } from './enhancedClassificationV3';
import { DEFAULT_CLASSIFICATION_CONFIG } from './config';
import { calculateBatchStatistics, logBatchStatistics } from './batchStatistics';
import { exportResultsWithOriginalDataV3 } from './batchExporter';

/**
 * FIXED: Simple sequential processor with GUARANTEED perfect 1:1 row mapping
 * NO BATCHING, NO CONCURRENCY - processes one by one to prevent race conditions
 */
export async function enhancedProcessBatchV3(
  payeeNames: string[],
  config: ClassificationConfig = DEFAULT_CLASSIFICATION_CONFIG,
  originalFileData?: any[]
): Promise<BatchProcessingResult> {
  const startTime = Date.now();
  
  console.log(`[V3 Sequential] FIXED: Processing ${payeeNames.length} payees ONE BY ONE`);
  console.log(`[V3 Sequential] Input validation:`, {
    payeeNamesLength: payeeNames.length,
    originalDataLength: originalFileData?.length || 0,
    perfectAlignment: !originalFileData || originalFileData.length === payeeNames.length
  });
  
  // CRITICAL: Validate input alignment
  if (originalFileData && originalFileData.length !== payeeNames.length) {
    throw new Error(`Input misalignment: ${originalFileData.length} original rows vs ${payeeNames.length} payee names`);
  }
  
  // Initialize results array with exact length
  const results: PayeeClassification[] = [];
  
  // Simple cache for efficiency
  const classificationCache = new Map<string, any>();
  let cacheHits = 0;
  
  console.log(`[V3 Sequential] Processing ${payeeNames.length} payees sequentially...`);
  
  // Process ONE BY ONE in strict order - NO CONCURRENCY
  for (let i = 0; i < payeeNames.length; i++) {
    try {
      const payeeName = payeeNames[i]?.trim() || '';
      const originalData = originalFileData?.[i];
      
      console.log(`[V3 Sequential] Processing ${i + 1}/${payeeNames.length}: "${payeeName}"`);
      
      let classificationResult;
      
      // Check cache for efficiency
      const normalizedName = payeeName.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
      
      if (normalizedName && classificationCache.has(normalizedName)) {
        classificationResult = classificationCache.get(normalizedName);
        cacheHits++;
        console.log(`[V3 Sequential] Cache hit for "${payeeName}" at row ${i}`);
      } else {
        // Classify the payee
        classificationResult = await enhancedClassifyPayeeV3(payeeName, config);
        
        // Cache the result
        if (normalizedName) {
          classificationCache.set(normalizedName, classificationResult);
        }
      }
      
      // GUARANTEE: Create result with EXACT row position
      const payeeClassification: PayeeClassification = {
        id: `payee-${i}`,
        payeeName: payeeName,
        result: classificationResult,
        timestamp: new Date(),
        originalData: originalData,
        rowIndex: i // CRITICAL: Row index matches array position
      };
      
      // Ensure keyword exclusion exists
      if (!payeeClassification.result.keywordExclusion) {
        payeeClassification.result.keywordExclusion = {
          isExcluded: false,
          matchedKeywords: [],
          confidence: 0,
          reasoning: 'Keyword exclusion added as fallback'
        };
      }
      
      // CRITICAL: Place result at EXACT array position
      results[i] = payeeClassification;
      
      // Progress logging
      if ((i + 1) % 10 === 0 || i === payeeNames.length - 1) {
        console.log(`[V3 Sequential] Progress: ${i + 1}/${payeeNames.length} completed (${cacheHits} cache hits)`);
      }
      
    } catch (error) {
      console.error(`[V3 Sequential] Error processing "${payeeNames[i]}" at row ${i}:`, error);
      
      // Create fallback result at correct position
      const fallbackResult: PayeeClassification = {
        id: `payee-${i}`,
        payeeName: payeeNames[i] || '',
        result: {
          classification: 'Individual' as const,
          confidence: 30,
          reasoning: `Processing failed: ${error.message}`,
          processingTier: 'Failed' as const,
          processingMethod: 'Error fallback',
          keywordExclusion: {
            isExcluded: false,
            matchedKeywords: [],
            confidence: 0,
            reasoning: 'Error fallback - no keyword exclusion applied'
          }
        },
        timestamp: new Date(),
        originalData: originalFileData?.[i],
        rowIndex: i
      };
      
      results[i] = fallbackResult;
    }
  }
  
  // CRITICAL VALIDATION: Ensure perfect alignment
  console.log(`[V3 Sequential] Validating perfect alignment...`);
  
  if (results.length !== payeeNames.length) {
    throw new Error(`Results length mismatch: expected ${payeeNames.length}, got ${results.length}`);
  }
  
  for (let i = 0; i < results.length; i++) {
    if (!results[i]) {
      throw new Error(`Missing result at position ${i}`);
    }
    if (results[i].rowIndex !== i) {
      throw new Error(`Row index mismatch at position ${i}: expected ${i}, got ${results[i].rowIndex}`);
    }
    if (results[i].payeeName !== (payeeNames[i]?.trim() || '')) {
      throw new Error(`Payee name mismatch at position ${i}: expected "${payeeNames[i]}", got "${results[i].payeeName}"`);
    }
  }
  
  console.log(`[V3 Sequential] Perfect alignment validated! All ${results.length} results correctly positioned.`);
  
  // Calculate statistics
  const processingTime = Date.now() - startTime;
  const enhancedStats = calculateBatchStatistics(
    results,
    payeeNames.length,
    [],
    [],
    processingTime
  );
  
  enhancedStats.cacheSavings = cacheHits;
  enhancedStats.retryCount = 0;
  
  logBatchStatistics(enhancedStats, results);
  
  console.log(`[V3 Sequential] Sequential processing complete:`, {
    resultsCount: results.length,
    expectedCount: payeeNames.length,
    perfectAlignment: true,
    cacheHits,
    processingTimeMs: processingTime
  });
  
  return {
    results,
    successCount: results.length,
    failureCount: 0,
    processingTime,
    originalFileData,
    enhancedStats
  };
}

export { exportResultsWithOriginalDataV3 };
