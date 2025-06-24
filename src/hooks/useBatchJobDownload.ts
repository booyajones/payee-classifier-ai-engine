
import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { PayeeRowData } from "@/lib/rowMapping";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { useBatchJobChunkedDownload } from "./useBatchJobChunkedDownload";
import { processBatchResults } from "@/services/batchResultProcessor";
import { useToast } from "@/components/ui/use-toast";

interface UseBatchJobDownloadProps {
  payeeRowDataMap: Record<string, PayeeRowData>;
  onJobComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
  isDownloadCancelled: (jobId: string) => boolean;
  updateProgress: (jobId: string, current: number, total: number) => void;
}

export const useBatchJobDownload = ({
  payeeRowDataMap,
  onJobComplete,
  isDownloadCancelled,
  updateProgress
}: UseBatchJobDownloadProps) => {
  const { toast } = useToast();
  const { downloadChunkedResults, isDownloadRetrying } = useBatchJobChunkedDownload();

  const handleDownloadResults = async (job: BatchJob) => {
    console.log(`[BATCH DOWNLOAD] Starting download for job ${job.id}`);
    console.log(`[BATCH DOWNLOAD] onJobComplete type:`, typeof onJobComplete);
    
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
      console.log(`[BATCH DOWNLOAD] Starting download for job ${job.id} with ${uniquePayeeNames.length} payees`);
      
      const rawResults = await downloadChunkedResults(
        job,
        uniquePayeeNames,
        (current: number, total: number) => updateProgress(job.id, current, total),
        isDownloadCancelled
      );

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
        title: "Download Complete",
        description: `Successfully downloaded ${finalClassifications.length} results.`,
      });

    } catch (error) {
      console.error('[BATCH DOWNLOAD] Download failed:', error);
      
      if (error instanceof Error && error.message.includes('cancelled')) {
        toast({
          title: "Download Cancelled",
          description: "The download was cancelled by user.",
          variant: "destructive"
        });
      } else if (error instanceof Error && error.message.includes('Partial download')) {
        toast({
          title: "Partial Download",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Download Failed",
          description: error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive"
        });
      }
      throw error;
    }
  };

  return {
    handleDownloadResults,
    isDownloadRetrying
  };
};
