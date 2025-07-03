import { useBatchJobPolling } from "@/hooks/useBatchJobPolling";
import { useBatchJobRefresh } from "@/hooks/useBatchJobRefresh";
import { useBatchJobDownload } from "@/hooks/useBatchJobDownload";
import { useBatchJobCancellation } from "@/hooks/useBatchJobCancellation";
import { useToast } from "@/hooks/use-toast";
import { createSafeCallbacks } from "./batchJobCallbackUtils";
import { createActionHandlers } from "./batchJobActionHandlers";
import { createStallDetection } from "./batchJobStallUtils";

export const useBatchJobActions = ({
  jobs,
  payeeRowDataMap,
  onJobUpdate,
  onJobComplete
}) => {
  const { toast } = useToast();

  // Create safe callback wrappers
  const { safeOnJobUpdate, safeOnJobComplete } = createSafeCallbacks(toast);
  const wrappedOnJobUpdate = safeOnJobUpdate(onJobUpdate);
  const wrappedOnJobComplete = safeOnJobComplete(onJobComplete);

  // Initialize hooks with safe callbacks
  const { refreshingJobs, handleRefreshJob: baseHandleRefreshJob, detectStalledJob } = useBatchJobRefresh(wrappedOnJobUpdate);
  const { pollingStates, refreshSpecificJob } = useBatchJobPolling(jobs, wrappedOnJobUpdate);
  const { handleCancelJob } = useBatchJobCancellation(wrappedOnJobUpdate);
  
  const { handleDownloadResults: baseHandleDownloadResults } = useBatchJobDownload({
    payeeRowDataMap,
    onJobComplete: wrappedOnJobComplete
  });

  // Create action handlers
  const { handleRefreshJob, handleDownloadResults, handleCancelJob: handleCancelJobWithValidation } = createActionHandlers(
    jobs,
    payeeRowDataMap,
    toast,
    refreshSpecificJob,
    baseHandleRefreshJob,
    detectStalledJob,
    baseHandleDownloadResults,
    handleCancelJob
  );

  // Create stall detection utilities
  const { getStalledJobActions } = createStallDetection(detectStalledJob, payeeRowDataMap);

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