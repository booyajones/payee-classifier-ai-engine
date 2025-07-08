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
import { useEmergencyKillSwitch } from '@/hooks/useEmergencyKillSwitch';

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
  });

  // PERFORMANCE: Debounced job update handler to prevent cascading renders
  const debouncedUpdateJob = useCallback((job: any) => {
    if (emergencyStop.check()) {
      console.warn('[BATCH JOB MANAGER] Emergency stop active, blocking job update');
      return;
    }

    // CIRCUIT BREAKER: Prevent updates for completed jobs
    if (['completed', 'failed', 'cancelled', 'expired'].includes(job.status)) {
      const existingJob = jobs.find(j => j.id === job.id);
      if (existingJob && ['completed', 'failed', 'cancelled', 'expired'].includes(existingJob.status)) {
        console.warn(`[BATCH JOB MANAGER] Blocking update for already ${existingJob.status} job`);
        return;
      }
    }

    debouncedStoreUpdater.scheduleUpdate(job, updateJob);
  }, [jobs, updateJob]);

  // PERFORMANCE: Memoize jobs to prevent unnecessary recalculations
  const stableJobs = useMemo(() => {
    const jobsString = JSON.stringify(jobs.map(j => ({ id: j.id, status: j.status, created_at: j.created_at })));
    if (lastJobsRef.current === jobsString) {
      return lastJobsRef.current === '' ? jobs : jobs; // Return the same reference if nothing changed
    }
    lastJobsRef.current = jobsString;
    return jobs;
  }, [jobs]);

  // Initialize large job optimization
  const largeJobOptimization = useLargeJobOptimization();

  // EMERGENCY FIX: Add status sync for recovery from completion update blocks
  const { syncJobStatus, syncAllJobStatuses } = useJobStatusSync({ onJobUpdate: debouncedUpdateJob });

  // EMERGENCY KILL SWITCH: Stop all jobs if system becomes unresponsive
  const { emergencyKillAll, quickReset, isEmergencyActive } = useEmergencyKillSwitch();

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
    // EMERGENCY FIX: Status sync functions for manual recovery
    syncJobStatus,
    syncAllJobStatuses,
    // EMERGENCY KILL SWITCH
    emergencyKillAll,
    quickReset,
    isEmergencyActive,
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
    syncJobStatus,
    syncAllJobStatuses,
    emergencyKillAll,
    quickReset,
    isEmergencyActive
  ]);
};