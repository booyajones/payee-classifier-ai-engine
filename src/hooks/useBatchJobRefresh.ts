
import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { useBatchJobRefreshCore } from "./batch/refresh/useBatchJobRefreshCore";
import { useBatchJobForceSync } from "./batch/refresh/useBatchJobForceSync";

/**
 * Main hook that combines all batch job refresh functionality
 * This is a simplified wrapper around the refactored components
 */
export const useBatchJobRefresh = (onJobUpdate: (job: BatchJob) => void) => {
  const {
    refreshingJobs,
    handleRefreshJob,
    handleForceRefresh,
    isRefreshRetrying,
    detectStalledJob
  } = useBatchJobRefreshCore(onJobUpdate);

  const { handleForceStatusSync } = useBatchJobForceSync(onJobUpdate);

  return {
    refreshingJobs,
    handleRefreshJob,
    handleForceRefresh,
    handleForceStatusSync,
    isRefreshRetrying,
    detectStalledJob
  };
};
