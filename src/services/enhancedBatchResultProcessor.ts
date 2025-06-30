
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { checkKeywordExclusion } from '@/lib/classification/enhancedKeywordExclusion';

interface ProcessingStats {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  businessCount: number;
  sicCodeCount: number;
  sicValidationErrors: number;
  sicPreservationErrors: number;
  excludedCount: number;
  excludedOverrides: number;
}

interface TrueBatchClassificationResult {
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
  sicCode?: string;
  sicDescription?: string;
}

export function processEnhancedBatchResults(
  processedResults: TrueBatchClassificationResult[],
  uniquePayeeNames: string[],
  payeeData: PayeeRowData,
  job: BatchJob
): { finalClassifications: PayeeClassification[], summary: BatchProcessingResult } {
  console.log(`[ENHANCED PROCESSOR] === PROCESSING ${processedResults.length} RESULTS WITH KEYWORD EXCLUSION AND SIC VALIDATION ===`);
  
  const stats: ProcessingStats = {
    totalProcessed: 0,
    successCount: 0,
    failureCount: 0,
    businessCount: 0,
    sicCodeCount: 0,
    sicValidationErrors: 0,
    sicPreservationErrors: 0,
    excludedCount: 0,
    excludedOverrides: 0
  };
  
  const finalClassifications: PayeeClassification[] = [];
  const processingErrors: string[] = [];

  for (let i = 0; i < processedResults.length; i++) {
    const processedResult = processedResults[i];
    const payeeName = uniquePayeeNames[i];
    stats.totalProcessed++;

    console.log(`[ENHANCED PROCESSOR] Processing ${i + 1}/${processedResults.length}: "${payeeName}"`);

    try {
      // Phase 1: Apply keyword exclusion check
      console.log(`[ENHANCED PROCESSOR] Checking keyword exclusion for: "${payeeName}"`);
      const exclusionResult = checkKeywordExclusion(payeeName);
      
      if (exclusionResult.isExcluded) {
        stats.excludedCount++;
        console.log(`[ENHANCED PROCESSOR] ✅ EXCLUDED: "${payeeName}" - Matched: [${exclusionResult.matchedKeywords.join(', ')}]`);
        
        // Override AI classification for excluded payees
        if (processedResult.classification !== 'Business') {
          stats.excludedOverrides++;
          console.log(`[ENHANCED PROCESSOR] ⚠️ OVERRIDE: "${payeeName}" AI said "${processedResult.classification}" but exclusion forces "Business"`);
        }
      } else {
        console.log(`[ENHANCED PROCESSOR] ✅ NOT EXCLUDED: "${payeeName}" - proceeding with AI classification`);
      }

      // Phase 2: Validate the processed result structure
      if (!processedResult.classification || processedResult.confidence === undefined) {
        throw new Error(`Invalid processed result structure - missing classification or confidence`);
      }

      // Phase 3: Determine final classification (exclusion overrides AI)
      const finalClassification = exclusionResult.isExcluded ? 'Business' : processedResult.classification;
      const finalReasoning = exclusionResult.isExcluded 
        ? `Excluded due to keyword matching: ${exclusionResult.reasoning}. Original AI classification: ${processedResult.classification} (${processedResult.confidence}% confidence)`
        : processedResult.reasoning || 'AI classification result';

      // Phase 4: Track business classifications and SIC codes
      if (finalClassification === 'Business') {
        stats.businessCount++;
        
        if (processedResult.sicCode && !exclusionResult.isExcluded) {
          stats.sicCodeCount++;
          console.log(`[ENHANCED PROCESSOR] ✅ Business "${payeeName}" has SIC: ${processedResult.sicCode} - ${processedResult.sicDescription || 'No description'}`);
        } else if (!processedResult.sicCode && !exclusionResult.isExcluded) {
          console.error(`[ENHANCED PROCESSOR] ❌ Non-excluded business "${payeeName}" missing SIC code`);
          processingErrors.push(`Business "${payeeName}" missing SIC code`);
          stats.sicValidationErrors++;
        } else if (exclusionResult.isExcluded) {
          console.log(`[ENHANCED PROCESSOR] ℹ️ Excluded business "${payeeName}" - SIC code not required`);
        }
      }

      // Phase 5: Create classification with proper exclusion data
      const classification: PayeeClassification = {
        id: `${job.id}-${i}`,
        payeeName,
        result: {
          classification: finalClassification,
          confidence: exclusionResult.isExcluded ? exclusionResult.confidence : processedResult.confidence,
          reasoning: finalReasoning,
          processingTier: exclusionResult.isExcluded ? 'Excluded' : 'AI-Powered',
          processingMethod: exclusionResult.isExcluded ? 'Keyword Exclusion Override' : 'OpenAI Batch API',
          matchingRules: [],
          sicCode: exclusionResult.isExcluded ? undefined : processedResult.sicCode,
          sicDescription: exclusionResult.isExcluded ? undefined : processedResult.sicDescription,
          keywordExclusion: {
            isExcluded: exclusionResult.isExcluded,
            matchedKeywords: exclusionResult.matchedKeywords,
            confidence: exclusionResult.confidence,
            reasoning: exclusionResult.reasoning
          }
        },
        timestamp: new Date(),
        originalData: null,
        rowIndex: i
      };

      // Phase 6: Validate SIC preservation for non-excluded businesses
      if (!exclusionResult.isExcluded && processedResult.classification === 'Business' && processedResult.sicCode && !classification.result.sicCode) {
        stats.sicPreservationErrors++;
        processingErrors.push(`SIC code lost during processing for "${payeeName}"`);
        console.error(`[ENHANCED PROCESSOR] ❌ SIC preservation failed for "${payeeName}"`);
      } else if (classification.result.sicCode) {
        console.log(`[ENHANCED PROCESSOR] ✅ SIC preserved for "${payeeName}": ${classification.result.sicCode}`);
      }

      finalClassifications.push(classification);
      stats.successCount++;

    } catch (error) {
      console.error(`[ENHANCED PROCESSOR] Processing failed for "${payeeName}":`, error);
      stats.failureCount++;
      processingErrors.push(`Failed to process "${payeeName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Create failed classification
      const failedClassification: PayeeClassification = {
        id: `${job.id}-${i}-failed`,
        payeeName,
        result: {
          classification: 'Individual',
          confidence: 0,
          reasoning: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          processingTier: 'Failed',
          processingMethod: 'OpenAI Batch API',
          keywordExclusion: {
            isExcluded: false,
            matchedKeywords: [],
            confidence: 0,
            reasoning: 'No keyword exclusion applied due to processing failure'
          }
        },
        timestamp: new Date(),
        originalData: null,
        rowIndex: i
      };

      finalClassifications.push(failedClassification);
    }
  }

  // Enhanced reporting with exclusion statistics
  const sicCoverage = stats.businessCount > 0 ? Math.round((stats.sicCodeCount / stats.businessCount) * 100) : 0;
  const exclusionRate = stats.totalProcessed > 0 ? Math.round((stats.excludedCount / stats.totalProcessed) * 100) : 0;
  
  console.log(`[ENHANCED PROCESSOR] === PROCESSING COMPLETE WITH KEYWORD EXCLUSION AND SIC VALIDATION ===`);
  console.log(`[ENHANCED PROCESSOR] Statistics:`, {
    totalProcessed: stats.totalProcessed,
    successRate: `${Math.round((stats.successCount / stats.totalProcessed) * 100)}%`,
    businessCount: stats.businessCount,
    excludedCount: stats.excludedCount,
    exclusionRate: `${exclusionRate}%`,
    excludedOverrides: stats.excludedOverrides,
    sicCodeCount: stats.sicCodeCount,
    sicCoverage: `${sicCoverage}%`,
    validationErrors: stats.sicValidationErrors,
    preservationErrors: stats.sicPreservationErrors,
    totalErrors: processingErrors.length
  });

  if (stats.excludedCount > 0) {
    console.log(`[ENHANCED PROCESSOR] ✅ KEYWORD EXCLUSION APPLIED: ${stats.excludedCount} payees excluded (${exclusionRate}%)`);
    if (stats.excludedOverrides > 0) {
      console.log(`[ENHANCED PROCESSOR] ⚠️ AI OVERRIDES: ${stats.excludedOverrides} AI classifications overridden by exclusion`);
    }
  }

  if (processingErrors.length > 0) {
    console.warn(`[ENHANCED PROCESSOR] Processing errors detected:`, processingErrors.slice(0, 5));
  }

  if (stats.businessCount > 0 && stats.sicCodeCount === 0) {
    console.error(`[ENHANCED PROCESSOR] 🚨 CRITICAL: No SIC codes found for any non-excluded businesses!`);
  } else if (sicCoverage < 80 && stats.businessCount > stats.excludedCount) {
    console.warn(`[ENHANCED PROCESSOR] ⚠️ LOW SIC COVERAGE: Only ${sicCoverage}% of non-excluded businesses have SIC codes`);
  }

  const summary: BatchProcessingResult = {
    results: finalClassifications,
    successCount: stats.successCount,
    failureCount: stats.failureCount,
    originalFileData: payeeData.originalFileData || []
  };

  return { finalClassifications, summary };
}
