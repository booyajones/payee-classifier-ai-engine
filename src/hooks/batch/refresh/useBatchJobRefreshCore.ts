import { useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { BatchJob, checkBatchJobStatus } from "@/lib/openai/trueBatchAPI";
import { useApiRetry } from "@/hooks/useRetry";
import { BatchJobUpdater } from "@/lib/database/batchJobUpdater";
import { withRefreshTimeout } from "@/lib/openai/utils";
import { useBatchJobStallDetection } from "./useBatchJobStallDetection";
import { useBatchJobRefreshErrorHandler } from "./useBatchJobRefreshErrorHandler";

/**
 * Core hook for batch job refresh functionality
 */
export const useBatchJobRefreshCore = (onJobUpdate: (job: BatchJob) => void) => {
  const [refreshingJobs, setRefreshingJobs] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  
  // Circuit breaker to prevent multiple simultaneous requests
  const activeRequests = useRef<Map<string, { cancel: () => void }>>(new Map());
  const lastRequestTime = useRef<Map<string, number>>(new Map());

  const { detectStalledJob } = useBatchJobStallDetection();
  const { handleRefreshError } = useBatchJobRefreshErrorHandler();

  const {
    execute: refreshJobWithRetry,
    isRetrying: isRefreshRetrying
  } = useApiRetry(checkBatchJobStatus, { 
    maxRetries: 2, 
    baseDelay: 1000,
    onRetry: (attempt, error) => {
      console.log(`[JOB REFRESH] Retry attempt ${attempt}: ${error.message}`);
    },
    onMaxRetriesReached: (error) => {
      console.error(`[JOB REFRESH] Max retries reached: ${error.message}`);
    }
  });

  const handleRefreshJob = useCallback(async (jobId: string, silent: boolean = false) => {
    // More lenient circuit breaker: allow refreshes every 1 second instead of 2
    const now = Date.now();
    const lastRequest = lastRequestTime.current.get(jobId);
    if (lastRequest && now - lastRequest < 1000) {
      console.log(`[JOB REFRESH] Rate limited refresh request for ${jobId.substring(0, 8)} - too soon (${now - lastRequest}ms ago)`);
      return;
    }

    // Cancel any existing request for this job
    const existingRequest = activeRequests.current.get(jobId);
    if (existingRequest) {
      console.log(`[JOB REFRESH] Cancelling existing request for ${jobId.substring(0, 8)}`);
      existingRequest.cancel();
      activeRequests.current.delete(jobId);
    }

    console.log(`[JOB REFRESH] Starting refresh for job ${jobId.substring(0, 8)} (silent: ${silent})`);
    setRefreshingJobs(prev => new Set(prev).add(jobId));
    lastRequestTime.current.set(jobId, now);
    
    // Create cancellable request with timeout
    const { promise: refreshPromise, cancel } = withRefreshTimeout(
      checkBatchJobStatus(jobId),
      15000 // 15 second timeout for refresh operations
    );
    
    // Store the cancel function
    activeRequests.current.set(jobId, { cancel });

    try {
      console.log(`[JOB REFRESH] Refreshing job ${jobId.substring(0, 8)} with 15s timeout`);
      const updatedJob = await refreshPromise;
      console.log(`[JOB REFRESH] Job ${jobId.substring(0, 8)} status: ${updatedJob.status}, progress: ${updatedJob.request_counts.completed}/${updatedJob.request_counts.total}`);
      
      // Clean up the active request
      activeRequests.current.delete(jobId);
      
      // Check for truly stalled jobs (no forced cancellation)
      if (detectStalledJob(updatedJob)) {
        const createdTime = new Date(updatedJob.created_at * 1000);
        const timeSinceCreated = Date.now() - createdTime.getTime();
        console.warn(`[JOB REFRESH] STALLED JOB DETECTED: ${jobId.substring(0, 8)}`);
        const hasStartedProcessing = updatedJob.request_counts.completed > 0;
        
        toast({
          title: hasStartedProcessing ? "⚠️ Job Progress Stalled" : "⏳ Long Queue Time",
          description: hasStartedProcessing 
            ? `Job ${jobId.substring(0, 8)}... has made minimal progress in ${Math.round(timeSinceCreated/60000)} minutes. OpenAI batch jobs can take 12-24+ hours for large batches. Manual cancellation available if needed.`
            : `Job ${jobId.substring(0, 8)}... has been queued for ${Math.round(timeSinceCreated/60000)} minutes. This is normal during high demand periods.`,
          variant: hasStartedProcessing ? "destructive" : "default",
          duration: 12000,
        });
      }
      
      // Update job status in database and trigger automatic processing
      try {
        await BatchJobUpdater.updateBatchJobStatus(updatedJob);
      } catch (updateError) {
        console.warn(`[JOB REFRESH] Database update failed for ${jobId.substring(0, 8)}:`, updateError);
        // Don't fail the whole refresh if database update fails - continue with UI update
        // Database errors during file generation don't mean the job failed
      }
      
      onJobUpdate(updatedJob);
      
      // Show appropriate success toast - differentiate between progress and completion
      if (!silent) {
        if (updatedJob.status === 'completed') {
          toast({
            title: "✅ Job Completed",
            description: `Batch job (...${jobId.substring(-8)}) is now completed`,
            variant: "default",
            duration: 8000,
          });
        } else {
          toast({
            title: "Job Status Updated",
            description: `Job refreshed: ${updatedJob.status} (${updatedJob.request_counts.completed}/${updatedJob.request_counts.total})`,
            duration: 4000,
          });
        }
      }
    } catch (error) {
      // Clean up the active request
      activeRequests.current.delete(jobId);
      
      handleRefreshError(error, jobId, () => handleRefreshJob(jobId, silent));
    } finally {
      // Always clean up refresh state, even during emergency stop
      console.log(`[JOB REFRESH] Cleaning up refresh state for ${jobId.substring(0, 8)}`);
      setRefreshingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
      
      // Ensure cleanup happens even during emergency conditions
      activeRequests.current.delete(jobId);
    }
  }, [onJobUpdate, toast, detectStalledJob, handleRefreshError]);

  // Force refresh bypasses rate limiting for debugging
  const handleForceRefresh = useCallback(async (jobId: string) => {
    console.log(`[JOB REFRESH] FORCE REFRESH for job ${jobId.substring(0, 8)} - bypassing rate limits`);
    
    // Cancel any existing request
    const existingRequest = activeRequests.current.get(jobId);
    if (existingRequest) {
      existingRequest.cancel();
      activeRequests.current.delete(jobId);
    }

    // Reset rate limiting for this job
    lastRequestTime.current.delete(jobId);
    
    // Call normal refresh
    return handleRefreshJob(jobId, false);
  }, [handleRefreshJob]);

  return {
    refreshingJobs,
    handleRefreshJob,
    handleForceRefresh,
    isRefreshRetrying,
    detectStalledJob
  };
};