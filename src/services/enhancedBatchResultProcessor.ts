
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { validateOpenAIResponse, validateSICPreservation } from '@/lib/openai/sicCodeValidator';

interface ProcessingStats {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  businessCount: number;
  sicCodeCount: number;
  sicValidationErrors: number;
  sicPreservationErrors: number;
}

export function processEnhancedBatchResults(
  rawResults: any[],
  uniquePayeeNames: string[],
  payeeData: PayeeRowData,
  job: BatchJob
): { finalClassifications: PayeeClassification[], summary: BatchProcessingResult } {
  console.log(`[ENHANCED PROCESSOR] === PROCESSING ${rawResults.length} RESULTS WITH COMPREHENSIVE SIC VALIDATION ===`);
  
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

  for (let i = 0; i < rawResults.length; i++) {
    const rawResult = rawResults[i];
    const payeeName = uniquePayeeNames[i];
    stats.totalProcessed++;

    console.log(`[ENHANCED PROCESSOR] Processing ${i + 1}/${rawResults.length}: "${payeeName}"`);

    try {
      // Phase 1: Validate OpenAI response structure and SIC codes
      const validation = validateOpenAIResponse(rawResult, payeeName);
      
      if (!validation.hasValidStructure) {
        throw new Error(`OpenAI response validation failed: ${validation.errors.join(', ')}`);
      }
      
      if (validation.errors.length > 0) {
        stats.sicValidationErrors++;
        console.warn(`[ENHANCED PROCESSOR] SIC validation errors for "${payeeName}":`, validation.errors);
      }

      // Parse the validated response
      const content = rawResult.response.body.choices[0].message.content;
      const classificationResult = JSON.parse(content);

      // Phase 2: Track business classifications and SIC codes
      if (classificationResult.classification === 'Business') {
        stats.businessCount++;
        
        if (validation.hasSICCode && validation.sicValidation.isValid) {
          stats.sicCodeCount++;
          console.log(`[ENHANCED PROCESSOR] ✅ Business "${payeeName}" validated with SIC: ${validation.sicValidation.sicCode}`);
        } else {
          console.error(`[ENHANCED PROCESSOR] ❌ Business "${payeeName}" missing or invalid SIC code`);
          processingErrors.push(`Business "${payeeName}" missing SIC code`);
        }
      }

      // Phase 3: Create classification with SIC preservation validation
      const originalSIC = {
        sicCode: classificationResult.sicCode,
        sicDescription: classificationResult.sicDescription
      };

      const classification: PayeeClassification = {
        id: `${job.id}-${i}`,
        payeeName,
        result: {
          classification: classificationResult.classification,
          confidence: classificationResult.confidence,
          reasoning: classificationResult.reasoning || 'AI classification result',
          processingTier: 'AI-Powered',
          processingMethod: 'OpenAI Batch API',
          matchingRules: classificationResult.matchingRules || [],
          sicCode: validation.sicValidation.sicCode,
          sicDescription: validation.sicValidation.sicDescription,
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
      const processedSIC = {
        sicCode: classification.result.sicCode,
        sicDescription: classification.result.sicDescription
      };

      const preservationResult = validateSICPreservation(originalSIC, processedSIC, payeeName);
      if (!preservationResult.isPreserved) {
        stats.sicPreservationErrors++;
        processingErrors.push(...preservationResult.errors);
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
    console.error(`[ENHANCED PROCESSOR] 🚨 CRITICAL: No SIC codes found for any businesses! This suggests OpenAI is not returning SIC codes.`);
  }

  const summary: BatchProcessingResult = {
    results: finalClassifications,
    successCount: stats.successCount,
    failureCount: stats.failureCount,
    originalFileData: payeeData.originalFileData || []
  };

  return { finalClassifications, summary };
}
