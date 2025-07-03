
import { useToast } from "@/components/ui/use-toast";
import { BatchJob, cancelBatchJob } from "@/lib/openai/trueBatchAPI";
import { handleError, showErrorToast } from "@/lib/errorHandler";
import { useApiRetry } from "./useRetry";

export const useBatchJobCancellation = (onJobUpdate: (job: BatchJob) => void) => {
  const { toast } = useToast();
  
  const { execute: cancelJobWithRetry } = useApiRetry(cancelBatchJob, {
    maxRetries: 2,
    onRetry: (attempt, error) => {
      productionLogger.debug(`[CANCELLATION] Retry attempt ${attempt} for job cancellation: ${error.message}`);
    }
  });

  const handleCancelJob = async (jobId: string) => {
    try {
      productionLogger.debug(`[CANCELLATION] Cancelling job ${jobId}`);
      const cancelledJob = await cancelJobWithRetry(jobId);
      productionLogger.debug(`[CANCELLATION] Job ${jobId} cancelled successfully, new status:`, cancelledJob.status);
      onJobUpdate(cancelledJob);
      
      toast({
        title: "Job Cancelled",
        description: `Batch job has been cancelled successfully.`,
      });
    } catch (error) {
      const appError = handleError(error, 'Job Cancellation');
      productionLogger.error(`[CANCELLATION] Error cancelling job ${jobId}:`, error);
      showErrorToast(appError, 'Job Cancellation');
    }
  };

  const handleCancelDownload = (jobId: string) => {
    productionLogger.debug(`[DOWNLOAD CANCELLATION] Cancelling download for job ${jobId}`);
    
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
