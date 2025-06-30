
import { BatchJob, getBatchJobResults } from "@/lib/openai/trueBatchAPI";
import { PayeeRowData, mapResultsToOriginalRows } from "@/lib/rowMapping";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { processBatchResults } from "@/services/batchResultProcessor";
import { saveClassificationResultsWithValidation } from "@/lib/database/enhancedClassificationService";
import { useToast } from "@/components/ui/use-toast";
import { testSicCodePipeline } from "@/lib/testing/sicCodeTest";

interface UseBatchJobDownloadProps {
  payeeRowDataMap: Record<string, PayeeRowData>;
  onJobComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
}

export const useBatchJobDownload = ({
  payeeRowDataMap,
  onJobComplete
}: UseBatchJobDownloadProps) => {
  const { toast } = useToast();

  const handleDownloadResults = async (job: BatchJob) => {
    console.log(`[BATCH DOWNLOAD] === STARTING ENHANCED DOWNLOAD WITH COMPREHENSIVE SIC VALIDATION FOR JOB ${job.id} ===`);
    
    // Validate callback before proceeding
    if (typeof onJobComplete !== 'function') {
      const errorMsg = `onJobComplete callback is not a function (type: ${typeof onJobComplete})`;
      console.error(`[BATCH DOWNLOAD] ${errorMsg}`);
      toast({
        title: "Download Error",
        description: "Download callback function is missing. Please refresh the page and try again.",
        variant: "destructive"
      });
      throw new Error(errorMsg);
    }

    const payeeData = payeeRowDataMap[job.id];
    if (!payeeData) {
      toast({
        title: "Download Error",
        description: "Payee data not found for this job.",
        variant: "destructive"
      });
      return;
    }

    const uniquePayeeNames = payeeData.uniquePayeeNames;
    if (!uniquePayeeNames || uniquePayeeNames.length === 0) {
      toast({
        title: "Download Error",
        description: "No payee names found for this job.",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log(`[BATCH DOWNLOAD] Downloading results for ${uniquePayeeNames.length} unique payees from ${payeeData.originalFileData.length} original rows`);
      
      // Download raw results from OpenAI
      const rawResults = await getBatchJobResults(job, uniquePayeeNames);
      console.log(`[BATCH DOWNLOAD] Downloaded ${rawResults.length} raw results from OpenAI`);

      // Process results with enhanced validation
      const { finalClassifications, summary } = processBatchResults(
        rawResults,
        uniquePayeeNames,
        payeeData,
        job
      );

      console.log(`[BATCH DOWNLOAD] Enhanced processing complete: ${finalClassifications.length} unique classifications`);
      
      // Enhanced SIC code statistics after processing
      const businessResults = finalClassifications.filter(r => r.result.classification === 'Business');
      const sicResults = finalClassifications.filter(r => r.result.sicCode);
      const sicCoverage = businessResults.length > 0 ? Math.round((sicResults.length / businessResults.length) * 100) : 0;
      
      console.log(`[BATCH DOWNLOAD] Enhanced SIC Statistics: ${sicResults.length}/${businessResults.length} businesses (${sicCoverage}%) have SIC codes`);

      // Save with enhanced validation
      try {
        console.log(`[BATCH DOWNLOAD] Saving ${finalClassifications.length} results with enhanced validation`);
        const saveStats = await saveClassificationResultsWithValidation(finalClassifications, job.id);
        
        console.log(`[BATCH DOWNLOAD] Enhanced save complete:`, saveStats);
        
        if (saveStats.sicValidationErrors.length > 0) {
          console.warn('[BATCH DOWNLOAD] SIC validation errors during save:', saveStats.sicValidationErrors);
          toast({
            title: "SIC Code Validation Warnings",
            description: `Saved results but found ${saveStats.sicValidationErrors.length} SIC validation issues.`,
            variant: "destructive"
          });
        }
      } catch (dbError) {
        console.error('[BATCH DOWNLOAD] Enhanced database save failed:', dbError);
        toast({
          title: "Database Save Failed",
          description: "Results processed but database save failed with validation errors.",
          variant: "destructive"
        });
      }

      // Map to original rows with validation
      console.log(`[BATCH DOWNLOAD] Mapping ${finalClassifications.length} unique results to ${payeeData.originalFileData.length} original rows`);
      const mappedResults = mapResultsToOriginalRows(finalClassifications, payeeData);
      console.log(`[BATCH DOWNLOAD] Successfully mapped to ${mappedResults.length} original rows`);

      // Create full results with SIC validation
      const fullResults: PayeeClassification[] = mappedResults.map((row, index) => ({
        id: `${job.id}-${index}`,
        payeeName: row.original_payee_name || row.payeeName || `Unknown_${index}`,
        result: {
          classification: row.classification,
          confidence: row.confidence,
          reasoning: row.reasoning,
          processingTier: row.processingTier,
          processingMethod: row.processingMethod,
          sicCode: row.sicCode,
          sicDescription: row.sicDescription,
          matchingRules: [],
          keywordExclusion: {
            isExcluded: row.keywordExclusion === 'Yes',
            matchedKeywords: row.matchedKeywords ? row.matchedKeywords.split('; ') : [],
            confidence: parseFloat(row.keywordConfidence) || 0,
            reasoning: row.keywordReasoning
          }
        },
        timestamp: new Date(row.timestamp),
        originalData: row,
        rowIndex: index
      }));

      const updatedSummary: BatchProcessingResult = {
        ...summary,
        results: fullResults,
        originalFileData: payeeData.originalFileData
      };

      // Run comprehensive SIC pipeline test
      console.log('[BATCH DOWNLOAD] Running comprehensive SIC code pipeline test...');
      await testSicCodePipeline(updatedSummary);

      // Final validation before completion
      const finalSicCount = fullResults.filter(r => r.result.sicCode).length;
      const finalBusinessCount = fullResults.filter(r => r.result.classification === 'Business').length;
      const finalCoverage = finalBusinessCount > 0 ? Math.round((finalSicCount / finalBusinessCount) * 100) : 0;
      
      console.log(`[BATCH DOWNLOAD] Final validation: ${finalSicCount}/${finalBusinessCount} (${finalCoverage}%) results have SIC codes`);

      // Call completion callback
      onJobComplete(fullResults, updatedSummary, job.id);

      toast({
        title: "Enhanced Processing Complete",
        description: `Successfully processed ${fullResults.length} results with ${finalSicCount} SIC codes (${finalCoverage}% coverage).`,
      });

    } catch (error) {
      console.error('[BATCH DOWNLOAD] Enhanced download failed:', error);
      
      toast({
        title: "Enhanced Download Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred during enhanced processing",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    handleDownloadResults
  };
};
