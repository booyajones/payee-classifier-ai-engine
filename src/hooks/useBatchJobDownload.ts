
import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { useToast } from "@/hooks/use-toast";
import { UseBatchJobDownloadProps } from "./batch/downloadTypes";
import { validateJobComplete, validatePayeeData } from "./batch/downloadValidation";
import { processDownloadResults, saveProcessedResults } from "./batch/downloadProcessor";
import { mapAndFinalizeResults, logFinalValidation } from "./batch/downloadResultMapper";

export const useBatchJobDownload = ({
  payeeRowDataMap,
  onJobComplete
}: UseBatchJobDownloadProps) => {
  const { toast } = useToast();

  const handleDownloadResults = async (job: BatchJob) => {
    console.log(`[BATCH DOWNLOAD] === STARTING ENHANCED DOWNLOAD WITH CHUNKED PROCESSING FOR JOB ${job.id} ===`);
    
    // Validate callback before proceeding
    const callbackValidation = validateJobComplete(onJobComplete);
    if (!callbackValidation.isValid) {
      toast({
        title: "Download Error",
        description: callbackValidation.error,
        variant: "destructive"
      });
      throw new Error(callbackValidation.error);
    }

    // Validate payee data
    const payeeData = payeeRowDataMap[job.id];
    const payeeValidation = validatePayeeData(payeeData, job);
    if (!payeeValidation.isValid) {
      toast({
        title: "Download Error",
        description: payeeValidation.error,
        variant: "destructive"
      });
      return;
    }

    const uniquePayeeNames = payeeData!.uniquePayeeNames;

    try {
      // Show initial processing toast
      toast({
        title: "Processing Download",
        description: "Processing results with keyword exclusion and SIC validation. This may take several minutes for large files...",
      });

      // Process results with enhanced validation and progress tracking
      let currentProgress = 0;
      const onProgress = (processed: number, total: number, percentage: number) => {
        // Only update toast every 10% to avoid spam
        if (percentage >= currentProgress + 10) {
          currentProgress = Math.floor(percentage / 10) * 10;
          toast({
            title: "Processing Download",
            description: `Processing ${processed}/${total} results (${percentage}%)... Please wait.`,
          });
        }
      };

      const { finalClassifications, summary } = await processDownloadResults(
        { job, payeeData: payeeData!, uniquePayeeNames, onJobComplete },
        onProgress
      );

      // Enhanced SIC code statistics after processing
      const businessResults = finalClassifications.filter(r => r.result.classification === 'Business');
      const sicResults = finalClassifications.filter(r => r.result.sicCode);
      const sicCoverage = businessResults.length > 0 ? Math.round((sicResults.length / businessResults.length) * 100) : 0;
      
      console.log(`[BATCH DOWNLOAD] Enhanced SIC Statistics: ${sicResults.length}/${businessResults.length} businesses (${sicCoverage}%) have SIC codes`);

      // Save with enhanced validation
      const saveResult = await saveProcessedResults(finalClassifications, job.id);
      
      if (!saveResult.success) {
        toast({
          title: "Database Save Failed",
          description: saveResult.error,
          variant: "destructive"
        });
      } else if (saveResult.warning) {
        toast({
          title: "SIC Code Validation Warnings",
          description: saveResult.warning,
          variant: "destructive"
        });
      }

      // Map to original rows with chunked processing and progress
      toast({
        title: "Finalizing Download",
        description: "Mapping results to original data format. Almost done...",
      });

      const { fullResults, updatedSummary } = await mapAndFinalizeResults(
        finalClassifications,
        payeeData!,
        summary,
        job.id,
        (processed, total, percentage) => {
          if (percentage % 20 === 0) { // Update every 20%
            toast({
              title: "Finalizing Download",
              description: `Mapped ${processed}/${total} rows (${percentage}%). Almost done...`,
            });
          }
        }
      );

      // Final validation before completion
      logFinalValidation(fullResults);

      // Call completion callback
      onJobComplete(fullResults, updatedSummary, job.id);

      toast({
        title: "Download Complete",
        description: `Successfully processed ${fullResults.length} results with ${fullResults.filter(r => r.result.sicCode).length} SIC codes. Download should start automatically.`,
      });

    } catch (error) {
      console.error('[BATCH DOWNLOAD] Enhanced download failed:', error);
      
      toast({
        title: "Download Failed", 
        description: error instanceof Error ? error.message : "Unknown error occurred during processing. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    handleDownloadResults
  };
};
