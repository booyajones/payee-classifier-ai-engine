import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { PayeeRowData } from "@/lib/rowMapping";
import { handleError, showErrorToast } from "@/lib/errorHandler";
import { useToast } from "@/hooks/use-toast";
import { productionLogger } from '@/lib/logging/productionLogger';

export const createActionHandlers = (
  jobs: BatchJob[],
  payeeRowDataMap: Record<string, PayeeRowData>,
  toast: ReturnType<typeof useToast>['toast'],
  refreshSpecificJob: (jobId: string, refreshFn: () => Promise<void>) => Promise<void>,
  baseHandleRefreshJob: (jobId: string, silent?: boolean) => Promise<void>,
  detectStalledJob: (job: BatchJob) => boolean,
  baseHandleDownloadResults: (job: BatchJob) => Promise<void>,
  handleCancelJob: (jobId: string) => Promise<void>
) => {
  // Enhanced manual refresh with stall detection
  const handleRefreshJob = async (jobId: string, silent: boolean = false) => {
    try {
      productionLogger.debug(`Starting enhanced refresh for job ${jobId}${silent ? ' (silent)' : ''}`, undefined, 'BATCH_ACTIONS');
      
      // Comprehensive input validation
      if (!jobId || typeof jobId !== 'string') {
        throw new Error(`Invalid jobId provided for refresh: ${jobId} (type: ${typeof jobId})`);
      }
      
      if (jobId.length < 5) {
        throw new Error(`Invalid jobId format: ${jobId} (too short)`);
      }
      
      // Check if job exists in our jobs list
      const job = jobs.find(j => j.id === jobId);
      if (!job) {
        productionLogger.warn(`Job ${jobId} not found in current jobs list, proceeding with refresh anyway`, undefined, 'BATCH_ACTIONS');
      } else {
        // Pre-check for stalled jobs before refresh
        if (detectStalledJob(job)) {
          productionLogger.warn(`Job ${jobId} appears stalled before refresh`, undefined, 'BATCH_ACTIONS');
          toast({
            title: "Potentially Stalled Job",
            description: `Job ${jobId.substring(0, 8)}... may be stalled. Refreshing to verify status...`,
            variant: "destructive",
            duration: 6000,
          });
        }
      }
      
      // Call refresh with proper error handling
      await refreshSpecificJob(jobId, () => baseHandleRefreshJob(jobId, silent));
      
      productionLogger.info(`Enhanced refresh completed successfully for job ${jobId}`, undefined, 'BATCH_ACTIONS');
      
      // Note: Success toast is handled by useBatchJobRefresh.ts with detailed status info
      // No redundant toast needed here
      
    } catch (error) {
      productionLogger.error(`Enhanced refresh error for job ${jobId}`, error, 'BATCH_ACTIONS');
      
      const appError = handleError(error, 'Job Refresh');
      
      if (!silent) {
        showErrorToast(appError, 'Job Refresh');
      }
      
      throw appError;
    }
  };

  // Enhanced download with validation and error handling
  const handleDownloadResults = async (job: BatchJob) => {
    try {
      productionLogger.debug(`Starting enhanced download for job ${job.id}`, undefined, 'BATCH_ACTIONS');
      
      // Comprehensive input validation
      if (!job || typeof job !== 'object') {
        throw new Error(`Invalid job object provided to download: ${typeof job}`);
      }
      
      if (!job.id || typeof job.id !== 'string') {
        throw new Error(`Invalid job.id provided to download: ${job.id} (type: ${typeof job.id})`);
      }
      
      if (!job.status) {
        throw new Error(`Job ${job.id} is missing status information`);
      }
      
      // Check if job is in a downloadable state
      if (job.status !== 'completed') {
        throw new Error(`Job ${job.id} is not in completed state (current status: ${job.status})`);
      }
      
      // Check if we have payee data for this job
      if (!payeeRowDataMap[job.id]) {
        productionLogger.warn(`No payee data found for job ${job.id}, proceeding with download anyway`, undefined, 'BATCH_ACTIONS');
      }
      
      await baseHandleDownloadResults(job);
      
      productionLogger.info(`Enhanced download completed successfully for job ${job.id}`, undefined, 'BATCH_ACTIONS');
      
      toast({
        title: "Download Complete",
        description: `Successfully downloaded results for job ${job.id.substring(0, 8)}...`,
      });
      
    } catch (error) {
      productionLogger.error(`Enhanced download error for job ${job?.id}`, error, 'BATCH_ACTIONS');
      
      const appError = handleError(error, 'Results Download');
      showErrorToast(appError, 'Results Download');
      
      throw appError;
    }
  };

  // Enhanced cancel job with validation and stall handling
  const handleCancelJobWithValidation = async (jobId: string) => {
    try {
      productionLogger.debug(`Starting enhanced cancellation for job ${jobId}`, undefined, 'BATCH_ACTIONS');
      
      // Comprehensive input validation
      if (!jobId || typeof jobId !== 'string') {
        throw new Error(`Invalid jobId provided for cancellation: ${jobId} (type: ${typeof jobId})`);
      }
      
      // Check if job exists and is in a cancellable state
      const job = jobs.find(j => j.id === jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found in current jobs list`);
      }
      
      if (!['validating', 'in_progress', 'finalizing'].includes(job.status)) {
        throw new Error(`Job ${jobId} cannot be cancelled in current state: ${job.status}`);
      }

      // Special handling for stalled jobs
      if (detectStalledJob(job)) {
        productionLogger.info(`Cancelling stalled job ${jobId}`, undefined, 'BATCH_ACTIONS');
        toast({
          title: "Cancelling Stalled Job",
          description: `Cancelling job ${jobId.substring(0, 8)}... that appears to be stalled. You can retry with a new batch.`,
          duration: 6000,
        });
      }
      
      await handleCancelJob(jobId);
      
      productionLogger.info(`Enhanced cancellation completed successfully for job ${jobId}`, undefined, 'BATCH_ACTIONS');
      
      toast({
        title: "Job Cancelled",
        description: `Successfully cancelled job ${jobId.substring(0, 8)}...`,
      });
      
    } catch (error) {
      productionLogger.error(`Enhanced cancellation error for job ${jobId}`, error, 'BATCH_ACTIONS');
      
      const appError = handleError(error, 'Job Cancellation');
      showErrorToast(appError, 'Job Cancellation');
      
      throw appError;
    }
  };

  return {
    handleRefreshJob,
    handleDownloadResults,
    handleCancelJob: handleCancelJobWithValidation
  };
};
