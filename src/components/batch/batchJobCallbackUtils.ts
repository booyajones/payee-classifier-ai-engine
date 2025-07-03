import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { handleError, showErrorToast } from "@/lib/errorHandler";
import { useToast } from "@/hooks/use-toast";

export const createSafeCallbacks = (toast: ReturnType<typeof useToast>['toast']) => {
  // Enhanced callback validation and error handling
  const safeOnJobUpdate = (onJobUpdate: (job: BatchJob) => void) => (job: BatchJob) => {
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
  const safeOnJobComplete = (onJobComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void) => 
    (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => {
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

  return {
    safeOnJobUpdate,
    safeOnJobComplete
  };
};