
import { useToast } from "@/components/ui/use-toast";
import { BatchJob, cancelBatchJob } from "@/lib/openai/trueBatchAPI";
import { handleError, showErrorToast } from "@/lib/errorHandler";

export const useBatchJobCancellation = (onJobUpdate: (job: BatchJob) => void) => {
  const { toast } = useToast();

  const handleCancelJob = async (jobId: string) => {
    try {
      console.log(`[DEBUG] Cancelling job ${jobId}`);
      const cancelledJob = await cancelBatchJob(jobId);
      console.log(`[DEBUG] Job ${jobId} cancelled successfully, new status:`, cancelledJob.status);
      onJobUpdate(cancelledJob);
      
      toast({
        title: "Job Cancelled",
        description: `Batch job has been cancelled successfully.`,
      });
    } catch (error) {
      const appError = handleError(error, 'Job Cancellation');
      console.error(`[DEBUG] Error cancelling job ${jobId}:`, error);
      showErrorToast(appError, 'Job Cancellation');
    }
  };

  const handleCancelDownload = (jobId: string) => {
    console.log(`[DOWNLOAD] Cancelling download for job ${jobId}`);
    
    toast({
      title: "Download Cancelled",
      description: "Download has been cancelled.",
    });
  };

  return {
    handleCancelJob,
    handleCancelDownload
  };
};
