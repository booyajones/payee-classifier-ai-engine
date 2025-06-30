
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { testOpenAIResponse } from '@/lib/testing/sicCodeTest';

export function processBatchResults(
  rawResults: any[],
  uniquePayeeNames: string[],
  payeeData: PayeeRowData,
  job: BatchJob
): { finalClassifications: PayeeClassification[], summary: BatchProcessingResult } {
  console.log(`[BATCH PROCESSOR] === PROCESSING ${rawResults.length} RAW RESULTS WITH COMPREHENSIVE SIC CODE TESTING ===`);
  
  const finalClassifications: PayeeClassification[] = [];
  let successCount = 0;
  let failureCount = 0;
  let sicCodeCount = 0;
  let businessCount = 0;

  for (let i = 0; i < rawResults.length; i++) {
    const rawResult = rawResults[i];
    const payeeName = uniquePayeeNames[i];

    // Test OpenAI response structure
    testOpenAIResponse(rawResult, payeeName);

    try {
      // Parse the classification result from OpenAI
      let classificationResult;
      
      if (rawResult.response?.body?.choices?.[0]?.message?.content) {
        const content = rawResult.response.body.choices[0].message.content;
        
        try {
          classificationResult = JSON.parse(content);
        } catch (parseError) {
          console.error(`[BATCH PROCESSOR] JSON parse error for ${payeeName}:`, parseError);
          console.error(`[BATCH PROCESSOR] Raw content that failed to parse:`, content);
          throw new Error('Invalid JSON response from OpenAI');
        }
      } else {
        console.error(`[BATCH PROCESSOR] No valid response content for ${payeeName}:`, rawResult);
        throw new Error('No valid response content from OpenAI');
      }

      // Ensure we have the required fields
      if (!classificationResult.classification || classificationResult.confidence === undefined) {
        console.error(`[BATCH PROCESSOR] Missing required fields for ${payeeName}:`, classificationResult);
        throw new Error('Missing required classification fields');
      }

      // Track business classifications
      if (classificationResult.classification === 'Business') {
        businessCount++;
      }

      // Enhanced SIC code validation and logging
      const hasSicCode = classificationResult.sicCode ? true : false;
      if (classificationResult.classification === 'Business') {
        if (hasSicCode) {
          sicCodeCount++;
          console.log(`[BATCH PROCESSOR] ✅ Business "${payeeName}" has SIC: ${classificationResult.sicCode} - ${classificationResult.sicDescription?.substring(0, 50)}...`);
        } else {
          console.warn(`[BATCH PROCESSOR] ❌ Business "${payeeName}" missing SIC code! Full result:`, classificationResult);
        }
      }

      // Create the final classification object with comprehensive SIC code preservation
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
          // CRITICAL: Preserve SIC codes from OpenAI response with validation
          sicCode: classificationResult.sicCode || undefined,
          sicDescription: classificationResult.sicDescription || undefined,
          keywordExclusion: {
            isExcluded: false,
            matchedKeywords: [],
            confidence: 0,
            reasoning: 'No keyword exclusion applied'
          }
        },
        timestamp: new Date(),
        originalData: null, // Will be set during mapping
        rowIndex: i
      };

      // Validate SIC code was properly preserved
      if (classificationResult.classification === 'Business' && classificationResult.sicCode) {
        if (!classification.result.sicCode) {
          console.error(`[BATCH PROCESSOR] CRITICAL: SIC code lost during classification creation for ${payeeName}`);
        } else {
          console.log(`[BATCH PROCESSOR] ✅ SIC code preserved for ${payeeName}: ${classification.result.sicCode}`);
        }
      }

      finalClassifications.push(classification);
      successCount++;

    } catch (error) {
      console.error(`[BATCH PROCESSOR] Error processing result for ${payeeName}:`, error);
      
      // Create a failed classification
      const failedClassification: PayeeClassification = {
        id: `${job.id}-${i}-failed`,
        payeeName,
        result: {
          classification: 'Individual', // Default fallback
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
        originalData: null, // Will be set during mapping
        rowIndex: i
      };

      finalClassifications.push(failedClassification);
      failureCount++;
    }
  }

  // Create summary with detailed SIC code statistics
  const summary: BatchProcessingResult = {
    results: finalClassifications, // These are unique payee results
    successCount,
    failureCount,
    originalFileData: payeeData.originalFileData || []
  };

  console.log(`[BATCH PROCESSOR] === PROCESSING COMPLETE WITH DETAILED SIC STATISTICS ===`);
  console.log(`[BATCH PROCESSOR] Results:`, {
    uniquePayees: finalClassifications.length,
    originalRows: payeeData.originalFileData?.length || 0,
    success: successCount,
    failure: failureCount,
    businesses: businessCount,
    sicCodes: sicCodeCount,
    sicCoverage: businessCount > 0 ? `${Math.round((sicCodeCount / businessCount) * 100)}%` : '0%'
  });

  // Final validation of SIC codes in results
  const finalSicCount = finalClassifications.filter(r => r.result.sicCode).length;
  const finalBusinessCount = finalClassifications.filter(r => r.result.classification === 'Business').length;
  
  if (sicCodeCount !== finalSicCount) {
    console.error(`[BATCH PROCESSOR] CRITICAL: SIC code count mismatch! Expected ${sicCodeCount}, got ${finalSicCount}`);
  }

  console.log(`[BATCH PROCESSOR] Final SIC validation: ${finalSicCount}/${finalBusinessCount} businesses have SIC codes`);

  return { finalClassifications, summary };
}
