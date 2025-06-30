
import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { PayeeRowData } from "@/lib/rowMapping";
import { useBatchJobPolling } from "@/hooks/useBatchJobPolling";
import { useBatchJobRefresh } from "@/hooks/useBatchJobRefresh";
import { useBatchJobDownload } from "@/hooks/useBatchJobDownload";
import { useBatchJobCancellation } from "@/hooks/useBatchJobCancellation";
import { useToast } from "@/hooks/use-toast";
import { handleError, showErrorToast } from "@/lib/errorHandler";

interface UseBatchJobActionsProps {
  jobs: BatchJob[];
  payeeRowDataMap: Record<string, PayeeRowData>;
  onJobUpdate: (job: BatchJob) => void;
  onJobComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
}

export const useBatchJobActions = ({
  jobs,
  payeeRowDataMap,
  onJobUpdate,
  onJobComplete
}: UseBatchJobActionsProps) => {
  const { toast } = useToast();

  // Enhanced callback validation and error handling
  const safeOnJobUpdate = (job: BatchJob) => {
    try {
      if (typeof onJobUpdate === 'function') {
        console.log(`[BATCH ACTIONS] Calling onJobUpdate for job ${job.id} with status: ${job.status}`);
        onJobUpdate(job);
      } else {
        const error = new Error(`onJobUpdate is not a function (type: ${typeof onJobUpdate})`);
        console.error('[BATCH ACTIONS] Invalid onJobUpdate callback:', error);
        showErrorToast(handleError(error, 'Job Update Callback'), 'Job Update');
      }
    } catch (error) {
      console.error('[BATCH ACTIONS] Error in onJobUpdate:', error);
      const appError = handleError(error, 'Job Update Callback');
      showErrorToast(appError, 'Job Update');
    }
  };

  // Enhanced completion callback with comprehensive error handling
  const safeOnJobComplete = (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => {
    try {
      console.log(`[BATCH ACTIONS] onJobComplete called for job ${jobId} with ${results.length} results`);
      
      // Validate inputs
      if (!Array.isArray(results)) {
        throw new Error(`Invalid results array for job ${jobId}: expected array, got ${typeof results}`);
      }
      
      if (!summary || typeof summary !== 'object') {
        throw new Error(`Invalid summary object for job ${jobId}: expected object, got ${typeof summary}`);
      }
      
      if (typeof onJobComplete === 'function') {
        console.log(`[BATCH ACTIONS] Executing onJobComplete for job ${jobId}`);
        onJobComplete(results, summary, jobId);
        console.log(`[BATCH ACTIONS] onJobComplete executed successfully for job ${jobId}`);
        
        // Show success toast
        toast({
          title: "Job Completed",
          description: `Successfully processed ${results.length} payees for job ${jobId.substring(0, 8)}...`,
        });
        
      } else {
        const error = new Error(`onJobComplete callback is not a function (type: ${typeof onJobComplete})`);
        console.error('[BATCH ACTIONS] Invalid onJobComplete callback:', error);
        throw error;
      }
      
    } catch (error) {
      console.error('[BATCH ACTIONS] Error in onJobComplete:', error);
      const appError = handleError(error, 'Job Completion Callback');
      showErrorToast(appError, 'Job Completion');
      throw appError;
    }
  };

  const { refreshingJobs, handleRefreshJob: baseHandleRefreshJob, detectStalledJob } = useBatchJobRefresh(safeOnJobUpdate);
  const { pollingStates, refreshSpecificJob } = useBatchJobPolling(jobs, safeOnJobUpdate);
  const { handleCancelJob } = useBatchJobCancellation(safeOnJobUpdate);
  
  const { handleDownloadResults: baseHandleDownloadResults } = useBatchJobDownload({
    payeeRowDataMap,
    onJobComplete: safeOnJobComplete
  });

  // Enhanced manual refresh with stall detection
  const handleRefreshJob = async (jobId: string, silent: boolean = false) => {
    try {
      console.log(`[BATCH ACTIONS] Starting enhanced refresh for job ${jobId}${silent ? ' (silent)' : ''}`);
      
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
        console.warn(`[BATCH ACTIONS] Job ${jobId} not found in current jobs list, proceeding with refresh anyway`);
      } else {
        // Pre-check for stalled jobs before refresh
        if (detectStalledJob(job)) {
          console.warn(`[BATCH ACTIONS] Job ${jobId} appears stalled before refresh`);
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
      
      console.log(`[BATCH ACTIONS] Enhanced refresh completed successfully for job ${jobId}`);
      
      if (!silent) {
        toast({
          title: "Job Refreshed",
          description: `Successfully refreshed job ${jobId.substring(0, 8)}...`,
        });
      }
      
    } catch (error) {
      console.error(`[BATCH ACTIONS] Enhanced refresh error for job ${jobId}:`, error);
      
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
      console.log(`[BATCH ACTIONS] Starting enhanced download for job ${job.id}`);
      
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
        console.warn(`[BATCH ACTIONS] No payee data found for job ${job.id}, proceeding with download anyway`);
      }
      
      await baseHandleDownloadResults(job);
      
      console.log(`[BATCH ACTIONS] Enhanced download completed successfully for job ${job.id}`);
      
      toast({
        title: "Download Complete",
        description: `Successfully downloaded results for job ${job.id.substring(0, 8)}...`,
      });
      
    } catch (error) {
      console.error(`[BATCH ACTIONS] Enhanced download error for job ${job?.id}:`, error);
      
      const appError = handleError(error, 'Results Download');
      showErrorToast(appError, 'Results Download');
      
      throw appError;
    }
  };

  // Enhanced cancel job with validation and stall handling
  const handleCancelJobWithValidation = async (jobId: string) => {
    try {
      console.log(`[BATCH ACTIONS] Starting enhanced cancellation for job ${jobId}`);
      
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
        console.log(`[BATCH ACTIONS] Cancelling stalled job ${jobId}`);
        toast({
          title: "Cancelling Stalled Job",
          description: `Cancelling job ${jobId.substring(0, 8)}... that appears to be stalled. You can retry with a new batch.`,
          duration: 6000,
        });
      }
      
      await handleCancelJob(jobId);
      
      console.log(`[BATCH ACTIONS] Enhanced cancellation completed successfully for job ${jobId}`);
      
      toast({
        title: "Job Cancelled",
        description: `Successfully cancelled job ${jobId.substring(0, 8)}...`,
      });
      
    } catch (error) {
      console.error(`[BATCH ACTIONS] Enhanced cancellation error for job ${jobId}:`, error);
      
      const appError = handleError(error, 'Job Cancellation');
      showErrorToast(appError, 'Job Cancellation');
      
      throw appError;
    }
  };

  // New function to provide stall recovery suggestions
  const getStalledJobActions = (job: BatchJob) => {
    if (!detectStalledJob(job)) return null;
    
    return {
      isStalled: true,
      suggestions: [
        'Try refreshing the job status first',
        'If still stalled, cancel and create a new batch job',
        'Check your OpenAI API key and quota status',
        'Consider using single classification as an alternative'
      ],
      canCancel: ['validating', 'in_progress', 'finalizing'].includes(job.status),
      payeeCount: payeeRowDataMap[job.id]?.uniquePayeeNames?.length || 0
    };
  };

  return {
    // State
    refreshingJobs,
    pollingStates,
    
    // Enhanced actions with comprehensive error handling
    handleRefreshJob,
    handleDownloadResults,
    handleCancelJob: handleCancelJobWithValidation,
    
    // New stall detection utilities
    getStalledJobActions,
    detectStalledJob
  };
};
