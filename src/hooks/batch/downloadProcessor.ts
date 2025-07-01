
import { getBatchJobResults } from "@/lib/openai/trueBatchAPI";
import { processEnhancedBatchResults } from "@/services/batchProcessor";
import { saveClassificationResultsWithValidation } from "@/lib/database/enhancedClassificationService";
import { DownloadContext } from "./downloadTypes";

export async function processDownloadResults(
  context: DownloadContext,
  onProgress: (processed: number, total: number, percentage: number) => void
) {
  const { job, payeeData, uniquePayeeNames } = context;
  
  console.log(`[BATCH DOWNLOAD] Downloading results for ${uniquePayeeNames.length} unique payees from ${payeeData.originalFileData.length} original rows`);
  
  // Download raw results from OpenAI
  const rawResults = await getBatchJobResults(job, uniquePayeeNames);
  console.log(`[BATCH DOWNLOAD] Downloaded ${rawResults.length} raw results from OpenAI`);

  // Process results with enhanced validation and progress tracking
  const { finalClassifications, summary } = await processEnhancedBatchResults({
    rawResults,
    uniquePayeeNames,
    payeeData,
    job,
    onProgress
  });

  console.log(`[BATCH DOWNLOAD] Enhanced processing complete: ${finalClassifications.length} unique classifications`);
  
  return { finalClassifications, summary };
}

export async function saveProcessedResults(
  finalClassifications: any[],
  jobId: string
) {
  try {
    console.log(`[BATCH DOWNLOAD] Saving ${finalClassifications.length} results with enhanced validation`);
    const saveStats = await saveClassificationResultsWithValidation(finalClassifications, jobId);
    
    console.log(`[BATCH DOWNLOAD] Enhanced save complete:`, saveStats);
    
    if (saveStats.sicValidationErrors.length > 0) {
      console.warn('[BATCH DOWNLOAD] SIC validation errors during save:', saveStats.sicValidationErrors);
      return {
        success: true,
        warning: `Saved results but found ${saveStats.sicValidationErrors.length} SIC validation issues.`
      };
    }
    
    return { success: true };
  } catch (dbError) {
    console.error('[BATCH DOWNLOAD] Enhanced database save failed:', dbError);
    return {
      success: false,
      error: "Results processed but database save failed with validation errors."
    };
  }
}
