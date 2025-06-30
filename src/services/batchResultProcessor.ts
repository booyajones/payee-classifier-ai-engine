
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';

export function processBatchResults(
  rawResults: any[],
  uniquePayeeNames: string[],
  payeeData: PayeeRowData,
  job: BatchJob
): { finalClassifications: PayeeClassification[], summary: BatchProcessingResult } {
  console.log(`[BATCH PROCESSOR] Processing ${rawResults.length} raw results with SIC codes`);
  
  const finalClassifications: PayeeClassification[] = [];
  let successCount = 0;
  let failureCount = 0;
  let sicCodeCount = 0;

  for (let i = 0; i < rawResults.length; i++) {
    const rawResult = rawResults[i];
    const payeeName = uniquePayeeNames[i];

    try {
      // Parse the classification result from OpenAI
      let classificationResult;
      
      if (rawResult.response?.body?.choices?.[0]?.message?.content) {
        const content = rawResult.response.body.choices[0].message.content;
        try {
          classificationResult = JSON.parse(content);
        } catch (parseError) {
          console.error(`[BATCH PROCESSOR] JSON parse error for ${payeeName}:`, parseError);
          throw new Error('Invalid JSON response from OpenAI');
        }
      } else {
        throw new Error('No valid response content from OpenAI');
      }

      // Ensure we have the required fields
      if (!classificationResult.classification || !classificationResult.confidence) {
        throw new Error('Missing required classification fields');
      }

      // Log SIC code extraction for debugging
      const hasSicCode = classificationResult.sicCode ? true : false;
      if (classificationResult.classification === 'Business') {
        if (hasSicCode) {
          sicCodeCount++;
          console.log(`[BATCH PROCESSOR] ✅ Business "${payeeName}" has SIC: ${classificationResult.sicCode}`);
        } else {
          console.warn(`[BATCH PROCESSOR] ❌ Business "${payeeName}" missing SIC code`);
        }
      }

      // Create the final classification object
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
          // CRITICAL: Preserve SIC codes from OpenAI response
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

  // Create summary - NOTE: This is for unique payees, not original rows
  const businessCount = finalClassifications.filter(r => r.result.classification === 'Business').length;
  const summary: BatchProcessingResult = {
    results: finalClassifications, // These are unique payee results
    successCount,
    failureCount,
    originalFileData: payeeData.originalFileData || []
  };

  console.log(`[BATCH PROCESSOR] Processing complete:`, {
    uniquePayees: finalClassifications.length,
    originalRows: payeeData.originalFileData?.length || 0,
    success: successCount,
    failure: failureCount,
    businesses: businessCount,
    sicCodes: sicCodeCount,
    sicCoverage: businessCount > 0 ? `${Math.round((sicCodeCount / businessCount) * 100)}%` : '0%'
  });

  return { finalClassifications, summary };
}
