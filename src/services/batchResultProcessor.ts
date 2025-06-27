
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { PayeeRowData, mapResultsToOriginalRows } from "@/lib/rowMapping";
import { checkKeywordExclusion } from "@/lib/classification/enhancedKeywordExclusion";
import { BatchJob } from "@/lib/openai/trueBatchAPI";

export const processBatchResults = (
  rawResults: any[],
  uniquePayeeNames: string[],
  payeeRowData: PayeeRowData,
  job: BatchJob
): { finalClassifications: PayeeClassification[]; summary: BatchProcessingResult } => {
  console.log(`[RESULT PROCESSOR] Creating classifications for ${rawResults.length} unique payees with enhanced SIC code extraction...`);

  // Create classifications for unique payees with improved SIC code handling
  const uniquePayeeClassifications: PayeeClassification[] = [];
  
  for (let i = 0; i < rawResults.length; i++) {
    const payeeName = uniquePayeeNames[i];
    const rawResult = rawResults[i];
    
    const keywordExclusion = checkKeywordExclusion(payeeName);
    
    // Enhanced SIC code extraction with multiple fallback paths
    const sicCode = rawResult?.sicCode || rawResult?.sic_code || rawResult?.SICCode || rawResult?.SIC_CODE || null;
    const sicDescription = rawResult?.sicDescription || rawResult?.sic_description || rawResult?.SICDescription || rawResult?.SIC_DESCRIPTION || null;
    
    // Debug SIC code extraction for each result
    console.log(`[SIC DEBUG] Processing "${payeeName}": Classification=${rawResult?.classification}, SIC=${sicCode}, Description=${sicDescription ? sicDescription.substring(0, 50) + '...' : 'None'}`);
    
    // Validate SIC code format (should be 4 digits for valid codes)
    const validSicCode = sicCode && /^\d{4}$/.test(sicCode.toString()) ? sicCode.toString() : null;
    const validSicDescription = validSicCode ? sicDescription : null;
    
    if (rawResult?.classification === 'Business' && !validSicCode) {
      console.warn(`[SIC WARNING] Business "${payeeName}" missing valid SIC code (received: ${sicCode})`);
    }
    
    uniquePayeeClassifications.push({
      id: `job-${job.id}-payee-${i}`,
      payeeName: payeeName,
      result: {
        classification: rawResult?.classification || 'Individual',
        confidence: rawResult?.confidence || 50,
        reasoning: rawResult?.reasoning || 'OpenAI batch processing result with SIC codes',
        processingTier: rawResult?.status === 'success' ? 'AI-Powered' : 'Failed',
        processingMethod: 'OpenAI Batch API with Enhanced SIC Codes',
        keywordExclusion: keywordExclusion,
        sicCode: validSicCode,
        sicDescription: validSicDescription
      },
      timestamp: new Date(),
      originalData: null,
      rowIndex: i
    });
  }

  console.log(`[RESULT PROCESSOR] Created ${uniquePayeeClassifications.length} unique payee classifications with SIC codes`);

  // Enhanced SIC code statistics and validation
  const businessResults = uniquePayeeClassifications.filter(c => c.result.classification === 'Business');
  const sicResults = uniquePayeeClassifications.filter(c => c.result.sicCode);
  const sicCoverage = businessResults.length > 0 ? Math.round((sicResults.length / businessResults.length) * 100) : 0;
  
  console.log(`[SIC STATISTICS] Total businesses: ${businessResults.length}, With SIC codes: ${sicResults.length}, Coverage: ${sicCoverage}%`);
  
  // Log sample SIC codes for verification
  if (sicResults.length > 0) {
    const sampleSicCodes = sicResults.slice(0, 3).map(r => ({
      payee: r.payeeName,
      sicCode: r.result.sicCode,
      sicDescription: r.result.sicDescription?.substring(0, 30) + '...'
    }));
    console.log(`[SIC SAMPLES]`, sampleSicCodes);
  }

  // Map results to original rows with SIC code preservation
  console.log(`[RESULT PROCESSOR] Mapping ${uniquePayeeClassifications.length} unique results to ${payeeRowData.originalFileData.length} original rows with SIC code preservation...`);
  
  const mappedResults = mapResultsToOriginalRows(uniquePayeeClassifications, payeeRowData);
  
  console.log(`[RESULT PROCESSOR] Mapped results count: ${mappedResults.length}`);
  
  if (mappedResults.length !== payeeRowData.originalFileData.length) {
    console.error(`[RESULT PROCESSOR] MAPPING ERROR:`, {
      mappedResultsLength: mappedResults.length,
      originalFileDataLength: payeeRowData.originalFileData.length,
      uniquePayeesLength: uniquePayeeNames.length
    });
    throw new Error(`Expected exactly ${payeeRowData.originalFileData.length} results, got ${mappedResults.length}`);
  }
  
  // Create final classifications with enhanced SIC code preservation and validation
  const finalClassifications: PayeeClassification[] = mappedResults.map((mappedRow, index) => {
    // Enhanced SIC code extraction from mapped results
    const sicCode = mappedRow.sicCode || mappedRow.sic_code || mappedRow.SICCode || mappedRow.SIC_CODE || undefined;
    const sicDescription = mappedRow.sicDescription || mappedRow.sic_description || mappedRow.SICDescription || mappedRow.SIC_DESCRIPTION || undefined;
    
    // Validate SIC code format in final results
    const finalSicCode = sicCode && /^\d{4}$/.test(sicCode.toString()) ? sicCode.toString() : undefined;
    const finalSicDescription = finalSicCode ? sicDescription : undefined;
    
    return {
      id: `job-${job.id}-row-${index}`,
      payeeName: mappedRow.PayeeName || mappedRow.payeeName || 'Unknown',
      result: {
        classification: mappedRow.classification || 'Individual',
        confidence: parseInt(mappedRow.confidence) || 50,
        reasoning: mappedRow.reasoning || 'Mapped from unique payee classification with SIC codes',
        processingTier: mappedRow.processingTier || 'AI-Powered',
        processingMethod: mappedRow.processingMethod || 'OpenAI Batch API with Enhanced SIC Codes',
        sicCode: finalSicCode,
        sicDescription: finalSicDescription,
        keywordExclusion: {
          isExcluded: mappedRow.keywordExclusion === 'Yes',
          matchedKeywords: mappedRow.matchedKeywords ? mappedRow.matchedKeywords.split('; ').filter(k => k) : [],
          confidence: parseInt(mappedRow.keywordConfidence) || 0,
          reasoning: mappedRow.keywordReasoning || 'No keyword exclusion applied'
        }
      },
      timestamp: new Date(mappedRow.timestamp || Date.now()),
      originalData: mappedRow,
      rowIndex: index
    };
  });

  const successCount = finalClassifications.filter(c => c.result.processingTier !== 'Failed').length;
  const failureCount = finalClassifications.length - successCount;
  const finalSicCount = finalClassifications.filter(c => c.result.sicCode).length;
  const finalBusinessCount = finalClassifications.filter(c => c.result.classification === 'Business').length;
  const finalSicCoverage = finalBusinessCount > 0 ? Math.round((finalSicCount / finalBusinessCount) * 100) : 0;

  const summary: BatchProcessingResult = {
    results: finalClassifications,
    successCount,
    failureCount,
    originalFileData: mappedResults
  };

  console.log(`[RESULT PROCESSOR] === FINAL SIC CODE STATISTICS FOR JOB ${job.id} ===`, {
    originalRows: payeeRowData.originalFileData.length,
    finalResults: finalClassifications.length,
    businessEntities: finalBusinessCount,
    sicCodesAssigned: finalSicCount,
    sicCoverage: `${finalSicCoverage}%`,
    successCount,
    failureCount
  });

  return { finalClassifications, summary };
};
