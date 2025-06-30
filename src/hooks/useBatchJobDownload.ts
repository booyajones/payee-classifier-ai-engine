import { BatchJob, getBatchJobResults } from "@/lib/openai/trueBatchAPI";
import { PayeeRowData, mapResultsToOriginalRows } from "@/lib/rowMapping";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { processBatchResults } from "@/services/batchResultProcessor";
import { saveClassificationResults } from "@/lib/database/classificationService";
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
    console.log(`[BATCH DOWNLOAD] === STARTING DOWNLOAD WITH COMPREHENSIVE SIC CODE TESTING FOR JOB ${job.id} ===`);
    
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

      // Process results into proper format (unique payee results) with SIC codes
      const { finalClassifications, summary } = processBatchResults(
        rawResults,
        uniquePayeeNames,
        payeeData,
        job
      );

      console.log(`[BATCH DOWNLOAD] Processed ${finalClassifications.length} unique classifications`);
      
      // Log detailed SIC code statistics after processing
      const businessResults = finalClassifications.filter(r => r.result.classification === 'Business');
      const sicResults = finalClassifications.filter(r => r.result.sicCode);
      console.log(`[BATCH DOWNLOAD] SIC Statistics after processing: ${sicResults.length}/${businessResults.length} businesses have SIC codes`);

      // Save unique results to database FIRST (before mapping) to preserve SIC codes
      try {
        console.log(`[BATCH DOWNLOAD] Saving ${finalClassifications.length} unique results to database with SIC codes`);
        await saveClassificationResults(finalClassifications, job.id);
        console.log(`[BATCH DOWNLOAD] Successfully saved results to database`);
      } catch (dbError) {
        console.error('[BATCH DOWNLOAD] Database save failed:', dbError);
        toast({
          title: "Database Save Warning",
          description: "Results processed but database save failed. Downloads may not include all SIC codes.",
          variant: "destructive"
        });
      }

      // CRITICAL: Map unique results back to original rows
      console.log(`[BATCH DOWNLOAD] Mapping ${finalClassifications.length} unique results to ${payeeData.originalFileData.length} original rows`);
      const mappedResults = mapResultsToOriginalRows(finalClassifications, payeeData);
      console.log(`[BATCH DOWNLOAD] Successfully mapped to ${mappedResults.length} original rows`);

      // Create PayeeClassification objects for each original row
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

      // Update summary with full results
      const updatedSummary: BatchProcessingResult = {
        ...summary,
        results: fullResults,
        originalFileData: payeeData.originalFileData
      };

      // RUN COMPREHENSIVE SIC CODE PIPELINE TEST
      console.log('[BATCH DOWNLOAD] Running comprehensive SIC code pipeline test...');
      await testSicCodePipeline(updatedSummary);

      // Call the completion callback with full mapped results
      const finalSicCount = fullResults.filter(r => r.result.sicCode).length;
      console.log(`[BATCH DOWNLOAD] Calling onJobComplete with ${fullResults.length} results (${finalSicCount} with SIC codes)`);
      onJobComplete(fullResults, updatedSummary, job.id);

      toast({
        title: "Results Ready",
        description: `Successfully processed ${fullResults.length} results with ${finalSicCount} SIC codes.`,
      });

    } catch (error) {
      console.error('[BATCH DOWNLOAD] Download failed:', error);
      
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    handleDownloadResults
  };
};
