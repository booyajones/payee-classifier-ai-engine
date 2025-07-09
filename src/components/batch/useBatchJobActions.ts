
import { useMemo } from "react";
import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { PayeeRowData } from "@/lib/rowMapping";
// Removed useBatchJobPolling - now handled by unified auto-refresh
import { useBatchJobRefresh } from "@/hooks/useBatchJobRefresh";
import { useBatchJobDownload } from "@/hooks/useBatchJobDownload";
import { useBatchJobCancellation } from "@/hooks/useBatchJobCancellation";
import { useToast } from "@/hooks/use-toast";
import { createSafeCallbacks } from "./batchJobCallbackUtils";
import { createActionHandlers } from "./batchJobActionHandlers";
import { createStallDetection } from "./batchJobStallUtils";

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

  // PERFORMANCE: Memoize callback wrappers to prevent recreation
  const { safeOnJobUpdate, safeOnJobComplete } = useMemo(() => createSafeCallbacks(toast), [toast]);
  const wrappedOnJobUpdate = useMemo(() => safeOnJobUpdate(onJobUpdate), [safeOnJobUpdate, onJobUpdate]);
  const wrappedOnJobComplete = useMemo(() => safeOnJobComplete(onJobComplete), [safeOnJobComplete, onJobComplete]);

  // PERFORMANCE: Memoize jobs array to prevent unnecessary re-renders
  const memoizedJobs = useMemo(() => jobs, [JSON.stringify(jobs.map(j => ({ id: j.id, status: j.status, created_at: j.created_at })))]);

  // Initialize hooks with safe callbacks  
  const { refreshingJobs, handleRefreshJob: baseHandleRefreshJob, handleForceRefresh, handleForceStatusSync, detectStalledJob } = useBatchJobRefresh(wrappedOnJobUpdate);
  const { handleCancelJob } = useBatchJobCancellation(wrappedOnJobUpdate);
  
  const { handleDownloadResults: baseHandleDownloadResults } = useBatchJobDownload({
    payeeRowDataMap,
    onJobComplete: wrappedOnJobComplete
  });

  // Create a dummy refreshSpecificJob function since it's now handled by unified auto-refresh
  const dummyRefreshSpecificJob = async (jobId: string, refreshFn: () => Promise<void>) => {
    await refreshFn();
  };

  // PERFORMANCE: Memoize action handlers to prevent recreation
  const actionHandlers = useMemo(() => createActionHandlers(
    memoizedJobs,
    payeeRowDataMap,
    toast,
    dummyRefreshSpecificJob,
    baseHandleRefreshJob,
    detectStalledJob,
    baseHandleDownloadResults,
    handleCancelJob
  ), [memoizedJobs, payeeRowDataMap, toast, baseHandleRefreshJob, detectStalledJob, baseHandleDownloadResults, handleCancelJob]);

  // PERFORMANCE: Memoize stall detection utilities
  const stallDetection = useMemo(() => createStallDetection(detectStalledJob, payeeRowDataMap), [detectStalledJob, payeeRowDataMap]);

  // PERFORMANCE: Memoize return object to prevent unnecessary re-renders
  return useMemo(() => ({
    // State
    refreshingJobs,
    
    // Enhanced actions with comprehensive error handling
    handleRefreshJob: actionHandlers.handleRefreshJob,
    handleForceRefresh, // FORCE REFRESH: Bypasses rate limits for debugging
    handleForceStatusSync, // EMERGENCY FIX: Direct database sync
    handleDownloadResults: actionHandlers.handleDownloadResults,
    handleCancelJob: actionHandlers.handleCancelJob,
    
    // New stall detection utilities
    getStalledJobActions: stallDetection.getStalledJobActions,
    detectStalledJob
  }), [refreshingJobs, actionHandlers, handleForceRefresh, handleForceStatusSync, stallDetection, detectStalledJob]);
};
