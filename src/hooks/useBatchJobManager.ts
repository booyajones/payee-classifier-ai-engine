import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useBatchJobStore } from '@/stores/batchJobStore';
import { useBatchJobActions } from '@/components/batch/useBatchJobActions';
import { useBatchJobAutoPolling } from '@/hooks/batch/useBatchJobAutoPolling';
import { useBatchJobRealtimeHandler } from '@/components/batch/BatchJobRealtimeHandler';
import { useBatchJobDownloadHandler } from '@/components/batch/BatchJobDownloadHandler';
import { useBatchJobActionsHandler } from '@/components/batch/BatchJobActionsHandler';
import { BatchJobTimeoutManager } from '@/components/batch/BatchJobTimeoutManager';
import { useLargeJobOptimization } from '@/hooks/batch/useLargeJobOptimization';
import { debouncedStoreUpdater } from '@/lib/performance/debounceStore';
import { emergencyStop } from '@/lib/performance/emergencyStop';
import { useJobStatusSync } from '@/hooks/useJobStatusSync';
import { useAutomaticJobCleanup } from '@/hooks/useAutomaticJobCleanup';
import { usePerformanceCleanup } from '@/hooks/batch/usePerformanceCleanup';

export const useBatchJobManager = () => {
  const {
    jobs,
    payeeDataMap,
    processing,
    updateJob,
    removeJob,
    setProcessing,
    clearError
  } = useBatchJobStore();
  
  const [autoPollingJobs, setAutoPollingJobs] = useState<Set<string>>(new Set());
  const renderCountRef = useRef(0);
  const lastJobsRef = useRef<string>('');
  const storeUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // CIRCUIT BREAKER: Track render count and detect render loops
  useEffect(() => {
    renderCountRef.current += 1;
    
    if (renderCountRef.current > 20) {
      console.error('[BATCH JOB MANAGER] Excessive renders detected, activating emergency stop');
      emergencyStop.activate('Excessive renders in BatchJobManager');
      return;
    }
    
    // Reset render count every 2 seconds
    const resetTimer = setTimeout(() => {
      renderCountRef.current = 0;
    }, 2000);
    
    return () => clearTimeout(resetTimer);
  }, []); // FIXED: Empty dependency array to prevent this useEffect itself from causing renders

  // PERFORMANCE: Debounced job update handler to prevent cascading renders
  const debouncedUpdateJob = useCallback((job: any) => {
    if (emergencyStop.check()) {
      console.warn('[BATCH JOB MANAGER] Emergency stop active, blocking job update');
      return;
    }

    // CIRCUIT BREAKER: Prevent updates for completed jobs that haven't changed
    if (['completed', 'failed', 'cancelled', 'expired'].includes(job.status)) {
      const existingJob = jobs.find(j => j.id === job.id);
      if (existingJob && existingJob.status === job.status) {
        // Job status hasn't changed, skip update to prevent render loops
        return;
      }
    }

    debouncedStoreUpdater.scheduleUpdate(job, updateJob);
  }, [updateJob]); // FIXED: Removed jobs dependency to prevent recreation

  // PERFORMANCE: Memoize jobs to prevent unnecessary recalculations
  const stableJobs = useMemo(() => {
    // FIXED: More stable memoization that only changes when meaningful changes occur
    const currentJobsHash = jobs.map(j => `${j.id}:${j.status}:${j.request_counts?.completed || 0}`).join('|');
    if (lastJobsRef.current === currentJobsHash) {
      return jobs;
    }
    lastJobsRef.current = currentJobsHash;
    return [...jobs]; // Return new array reference only when content actually changes
  }, [jobs]);

  // Initialize large job optimization
  const largeJobOptimization = useLargeJobOptimization();

  // AUTOMATIC MANAGEMENT: Background cleanup and maintenance
  const { performCleanup } = useAutomaticJobCleanup({ jobs: stableJobs });
  const { forceCleanup } = usePerformanceCleanup();

  // EMERGENCY FIX: Add status sync for recovery from completion update blocks
  const { syncJobStatus, syncAllJobStatuses } = useJobStatusSync({ onJobUpdate: debouncedUpdateJob });

  // DEBOUNCED: Handle real-time updates with debouncing
  useBatchJobRealtimeHandler({ onJobUpdate: debouncedUpdateJob });

  // FIXED: Call hooks at top level (not inside useMemo - this was causing the infinite loop!)
  const batchJobActions = useBatchJobActions({
    jobs: stableJobs,
    payeeRowDataMap: payeeDataMap,
    onJobUpdate: debouncedUpdateJob,
    onJobComplete: () => {} // Handle job completion if needed
  });

  // Emergency circuit breaker for the batch job actions
  const safeBatchJobActions = useMemo(() => {
    if (emergencyStop.check()) {
      return {
        refreshingJobs: new Set<string>(),
        pollingStates: {},
        handleRefreshJob: async () => {},
        handleDownloadResults: async () => {},
        handleCancelJob: () => {},
        getStalledJobActions: () => null,
        detectStalledJob: () => false
      };
    }
    return batchJobActions;
  }, [batchJobActions]);

  // Initialize auto-polling for active jobs (only if not in emergency mode)
  useBatchJobAutoPolling({
    jobs: emergencyStop.check() ? [] : stableJobs,
    autoPollingJobs,
    setAutoPollingJobs,
    handleRefreshJob: safeBatchJobActions.handleRefreshJob
  });

  // Download handler
  const { handleDownload } = useBatchJobDownloadHandler({ payeeDataMap });

  // Actions handler
  const { handleCancel, handleJobDelete: baseHandleJobDelete } = useBatchJobActionsHandler();

  // PERFORMANCE: Memoize job delete handler
  const handleJobDelete = useCallback((jobId: string) => {
    if (emergencyStop.check()) return;
    baseHandleJobDelete(jobId, removeJob);
  }, [baseHandleJobDelete, removeJob]);

  // PERFORMANCE: Heavily memoize stalled job actions calculation
  const stalledJobActions = useMemo(() => {
    if (emergencyStop.check() || !batchJobActions.getStalledJobActions) {
      return {};
    }

    return stableJobs.reduce((acc, job) => {
      try {
        const stalledAction = batchJobActions.getStalledJobActions(job);
        if (stalledAction) {
          acc[job.id] = stalledAction;
        }
      } catch (error) {
        console.warn(`[BATCH JOB MANAGER] Error calculating stalled action for job ${job.id}:`, error);
      }
      return acc;
    }, {} as Record<string, any>);
  }, [stableJobs, batchJobActions.getStalledJobActions]);

  // PERFORMANCE: Memoize return object to prevent parent re-renders
  return useMemo(() => ({
    jobs: stableJobs,
    payeeDataMap,
    refreshingJobs: batchJobActions.refreshingJobs,
    pollingStates: batchJobActions.pollingStates,
    stalledJobActions,
    handleRefreshJob: batchJobActions.handleRefreshJob,
    handleForceStatusSync: batchJobActions.handleForceStatusSync, // EMERGENCY FIX
    handleDownloadResults: batchJobActions.handleDownloadResults,
    handleCancelJob: batchJobActions.handleCancelJob,
    handleDownload,
    handleCancel,
    handleJobDelete,
    // Large job optimization
    largeJobOptimization,
    // AUTOMATIC CLEANUP: Background maintenance
    performCleanup,
    forceCleanup,
    // STATUS SYNC: Manual recovery functions
    syncJobStatus,
    syncAllJobStatuses,
    // Timeout manager component
    TimeoutManager: BatchJobTimeoutManager
  }), [
    stableJobs,
    payeeDataMap,
    batchJobActions,
    stalledJobActions,
    handleDownload,
    handleCancel,
    handleJobDelete,
    largeJobOptimization,
    performCleanup,
    forceCleanup,
    syncJobStatus,
    syncAllJobStatuses
  ]);
};