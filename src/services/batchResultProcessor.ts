
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
  console.log(`[RESULT PROCESSOR] Creating classifications for ${rawResults.length} unique payees with SIC codes...`);

  // Create classifications for unique payees
  const uniquePayeeClassifications: PayeeClassification[] = [];
  
  for (let i = 0; i < rawResults.length; i++) {
    const payeeName = uniquePayeeNames[i];
    const rawResult = rawResults[i];
    
    const keywordExclusion = checkKeywordExclusion(payeeName);
    
    // Extract SIC code information from the raw result
    const sicCode = rawResult?.sicCode || rawResult?.sic_code || null;
    const sicDescription = rawResult?.sicDescription || rawResult?.sic_description || null;
    
    console.log(`[RESULT PROCESSOR] Processing "${payeeName}": Classification=${rawResult?.classification}, SIC=${sicCode}`);
    
    uniquePayeeClassifications.push({
      id: `job-${job.id}-payee-${i}`,
      payeeName: payeeName,
      result: {
        classification: rawResult?.classification || 'Individual',
        confidence: rawResult?.confidence || 50,
        reasoning: rawResult?.reasoning || 'OpenAI batch processing result',
        processingTier: rawResult?.status === 'success' ? 'AI-Powered' : 'Failed',
        processingMethod: 'OpenAI Batch API with SIC Codes',
        keywordExclusion: keywordExclusion,
        sicCode: sicCode,
        sicDescription: sicDescription
      },
      timestamp: new Date(),
      originalData: null,
      rowIndex: i
    });
  }

  console.log(`[RESULT PROCESSOR] Created ${uniquePayeeClassifications.length} unique payee classifications with SIC codes`);

  // Debug SIC code assignment
  const businessResults = uniquePayeeClassifications.filter(c => c.result.classification === 'Business');
  const sicResults = uniquePayeeClassifications.filter(c => c.result.sicCode);
  console.log(`[RESULT PROCESSOR] SIC Code Summary: ${sicResults.length}/${businessResults.length} businesses have SIC codes`);

  // Map results to original rows
  console.log(`[RESULT PROCESSOR] Mapping ${uniquePayeeClassifications.length} unique results to ${payeeRowData.originalFileData.length} original rows...`);
  
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
  
  // Create final classifications with SIC code preservation
  const finalClassifications: PayeeClassification[] = mappedResults.map((mappedRow, index) => {
    return {
      id: `job-${job.id}-row-${index}`,
      payeeName: mappedRow.PayeeName || mappedRow.payeeName || 'Unknown',
      result: {
        classification: mappedRow.classification || 'Individual',
        confidence: parseInt(mappedRow.confidence) || 50,
        reasoning: mappedRow.reasoning || 'Mapped from unique payee classification',
        processingTier: mappedRow.processingTier || 'AI-Powered',
        processingMethod: mappedRow.processingMethod || 'OpenAI Batch API with SIC Codes',
        sicCode: mappedRow.sicCode || mappedRow.sic_code || undefined,
        sicDescription: mappedRow.sicDescription || mappedRow.sic_description || undefined,
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

  const summary: BatchProcessingResult = {
    results: finalClassifications,
    successCount,
    failureCount,
    originalFileData: mappedResults
  };

  console.log(`[RESULT PROCESSOR] === PROCESSING SUCCESS FOR JOB ${job.id} WITH SIC CODES ===`, {
    originalRows: payeeRowData.originalFileData.length,
    finalResults: finalClassifications.length,
    successCount,
    failureCount,
    sicCodesAssigned: finalSicCount
  });

  return { finalClassifications, summary };
};
