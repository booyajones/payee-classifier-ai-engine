
import { BatchJob, getBatchJobResults } from "@/lib/openai/trueBatchAPI";
import { PayeeRowData } from "@/lib/rowMapping";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { processBatchResults } from "@/services/batchResultProcessor";
import { useToast } from "@/components/ui/use-toast";

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
    console.log(`[BATCH DOWNLOAD] Starting download for job ${job.id}`);
    
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
      console.log(`[BATCH DOWNLOAD] Downloading results for job ${job.id} with ${uniquePayeeNames.length} payees`);
      
      // Simple direct download - no chunking needed
      const rawResults = await getBatchJobResults(job, uniquePayeeNames);

      console.log(`[BATCH DOWNLOAD] Download completed, processing ${rawResults.length} results`);

      const { finalClassifications, summary } = processBatchResults(
        rawResults,
        uniquePayeeNames,
        payeeData,
        job
      );

      console.log(`[BATCH DOWNLOAD] About to call onJobComplete with ${finalClassifications.length} results`);
      onJobComplete(finalClassifications, summary, job.id);
      console.log(`[BATCH DOWNLOAD] onJobComplete called successfully`);

      toast({
        title: "Results Ready",
        description: `Successfully processed ${finalClassifications.length} results.`,
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
