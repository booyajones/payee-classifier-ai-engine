
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';

interface ProcessingStats {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  businessCount: number;
  sicCodeCount: number;
  sicValidationErrors: number;
  sicPreservationErrors: number;
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
  console.log(`[ENHANCED PROCESSOR] === PROCESSING ${processedResults.length} RESULTS WITH COMPREHENSIVE SIC VALIDATION ===`);
  
  const stats: ProcessingStats = {
    totalProcessed: 0,
    successCount: 0,
    failureCount: 0,
    businessCount: 0,
    sicCodeCount: 0,
    sicValidationErrors: 0,
    sicPreservationErrors: 0
  };
  
  const finalClassifications: PayeeClassification[] = [];
  const processingErrors: string[] = [];

  for (let i = 0; i < processedResults.length; i++) {
    const processedResult = processedResults[i];
    const payeeName = uniquePayeeNames[i];
    stats.totalProcessed++;

    console.log(`[ENHANCED PROCESSOR] Processing ${i + 1}/${processedResults.length}: "${payeeName}"`);
    console.log(`[ENHANCED PROCESSOR] Result data:`, {
      classification: processedResult.classification,
      confidence: processedResult.confidence,
      hasSicCode: !!processedResult.sicCode,
      sicCode: processedResult.sicCode,
      sicDescription: processedResult.sicDescription
    });

    try {
      // Phase 1: Validate the processed result structure
      if (!processedResult.classification || processedResult.confidence === undefined) {
        throw new Error(`Invalid processed result structure - missing classification or confidence`);
      }

      // Phase 2: Track business classifications and SIC codes
      if (processedResult.classification === 'Business') {
        stats.businessCount++;
        
        if (processedResult.sicCode) {
          stats.sicCodeCount++;
          console.log(`[ENHANCED PROCESSOR] ✅ Business "${payeeName}" has SIC: ${processedResult.sicCode} - ${processedResult.sicDescription || 'No description'}`);
        } else {
          console.error(`[ENHANCED PROCESSOR] ❌ Business "${payeeName}" missing SIC code`);
          processingErrors.push(`Business "${payeeName}" missing SIC code`);
          stats.sicValidationErrors++;
        }
      }

      // Phase 3: Create classification with SIC preservation
      const classification: PayeeClassification = {
        id: `${job.id}-${i}`,
        payeeName,
        result: {
          classification: processedResult.classification,
          confidence: processedResult.confidence,
          reasoning: processedResult.reasoning || 'AI classification result',
          processingTier: 'AI-Powered',
          processingMethod: 'OpenAI Batch API',
          matchingRules: [],
          sicCode: processedResult.sicCode,
          sicDescription: processedResult.sicDescription,
          keywordExclusion: {
            isExcluded: false,
            matchedKeywords: [],
            confidence: 0,
            reasoning: 'No keyword exclusion applied'
          }
        },
        timestamp: new Date(),
        originalData: null,
        rowIndex: i
      };

      // Phase 4: Validate SIC preservation
      if (processedResult.classification === 'Business' && processedResult.sicCode && !classification.result.sicCode) {
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
            reasoning: 'No keyword exclusion applied'
          }
        },
        timestamp: new Date(),
        originalData: null,
        rowIndex: i
      };

      finalClassifications.push(failedClassification);
    }
  }

  // Enhanced reporting with error checking
  const sicCoverage = stats.businessCount > 0 ? Math.round((stats.sicCodeCount / stats.businessCount) * 100) : 0;
  
  console.log(`[ENHANCED PROCESSOR] === PROCESSING COMPLETE WITH DETAILED VALIDATION ===`);
  console.log(`[ENHANCED PROCESSOR] Statistics:`, {
    totalProcessed: stats.totalProcessed,
    successRate: `${Math.round((stats.successCount / stats.totalProcessed) * 100)}%`,
    businessCount: stats.businessCount,
    sicCodeCount: stats.sicCodeCount,
    sicCoverage: `${sicCoverage}%`,
    validationErrors: stats.sicValidationErrors,
    preservationErrors: stats.sicPreservationErrors,
    totalErrors: processingErrors.length
  });

  if (processingErrors.length > 0) {
    console.warn(`[ENHANCED PROCESSOR] Processing errors detected:`, processingErrors.slice(0, 5));
  }

  if (stats.businessCount > 0 && stats.sicCodeCount === 0) {
    console.error(`[ENHANCED PROCESSOR] 🚨 CRITICAL: No SIC codes found for any businesses!`);
  } else if (sicCoverage < 80 && stats.businessCount > 0) {
    console.warn(`[ENHANCED PROCESSOR] ⚠️ LOW SIC COVERAGE: Only ${sicCoverage}% of businesses have SIC codes`);
  }

  const summary: BatchProcessingResult = {
    results: finalClassifications,
    successCount: stats.successCount,
    failureCount: stats.failureCount,
    originalFileData: payeeData.originalFileData || []
  };

  return { finalClassifications, summary };
}
