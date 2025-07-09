import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useBatchJobStore } from '@/stores/batchJobStore';
import { useBatchJobActions } from '@/components/batch/useBatchJobActions';
import { useBatchJobRealtimeHandler } from '@/components/batch/BatchJobRealtimeHandler';
import { useBatchJobDownloadHandler } from '@/components/batch/BatchJobDownloadHandler';
import { useBatchJobActionsHandler } from '@/components/batch/BatchJobActionsHandler';
import { BatchJobTimeoutManager } from '@/components/batch/BatchJobTimeoutManager';
import { useLargeJobOptimization } from '@/hooks/batch/useLargeJobOptimization';
import { debouncedStoreUpdater } from '@/lib/performance/debounceStore';
import { useJobStatusSync } from '@/hooks/useJobStatusSync';
import { useUnifiedCleanup } from '@/hooks/useUnifiedCleanup';
import { useUnifiedPollingOrchestrator } from '@/hooks/useUnifiedPollingOrchestrator';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useStablePerformanceMonitor } from '@/hooks/useStablePerformanceMonitor';

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
  
  const lastJobsRef = useRef<string>('');
  
  // Network and performance monitoring
  const { isHealthy: networkHealthy } = useNetworkStatus();
  const { isStable: performanceStable } = useStablePerformanceMonitor();

  // Optimized job update handler with network awareness and automatic result processing
  const debouncedUpdateJob = useCallback(async (job: any) => {
    // Skip updates if network is unhealthy
    if (!networkHealthy) {
      console.warn('[BATCH JOB MANAGER] Network unhealthy, deferring job update');
      return;
    }

    const existingJob = jobs.find(j => j.id === job.id);
    
    // Check if job just completed and trigger ENHANCED result processing and file generation
    if (job.status === 'completed' && existingJob?.status !== 'completed' && job.output_file_id) {
      console.log(`[BATCH JOB MANAGER] Job ${job.id} just completed, triggering enhanced automatic processing...`);
      
      // Import and trigger automatic result processing AND file generation
      try {
        const { AutomaticResultProcessor } = await import('@/lib/services/automaticResultProcessor');
        const { EnhancedFileGenerationService } = await import('@/lib/services/enhancedFileGenerationService');
        
        // Process results first, then generate files
        AutomaticResultProcessor.processCompletedBatch(job).then(success => {
          if (success) {
            console.log(`[BATCH JOB MANAGER] Successfully processed results for job ${job.id}`);
            
            // Then generate files for instant downloads
            EnhancedFileGenerationService.processCompletedJob(job).then(fileResult => {
              if (fileResult.success) {
                console.log(`[BATCH JOB MANAGER] Files generated for job ${job.id} - instant downloads ready`);
              } else {
                console.warn(`[BATCH JOB MANAGER] File generation failed for job ${job.id}:`, fileResult.error);
              }
            }).catch(fileError => {
              console.error(`[BATCH JOB MANAGER] File generation error for job ${job.id}:`, fileError);
            });
          } else {
            console.warn(`[BATCH JOB MANAGER] Failed to process results for job ${job.id}`);
          }
        }).catch(error => {
          console.error(`[BATCH JOB MANAGER] Error processing results for job ${job.id}:`, error);
        });
      } catch (error) {
        console.error(`[BATCH JOB MANAGER] Failed to load AutomaticResultProcessor:`, error);
      }
    }

    // Skip redundant updates for completed jobs
    if (['completed', 'failed', 'cancelled', 'expired'].includes(job.status)) {
      if (existingJob && existingJob.status === job.status && 
          existingJob.request_counts?.completed === job.request_counts?.completed) {
        return;
      }
    }

    // Skip updates for very old jobs (over 24 hours)
    const jobAge = Date.now() - new Date(job.created_at * 1000).getTime();
    if (jobAge > 24 * 60 * 60 * 1000 && ['completed', 'failed', 'cancelled', 'expired'].includes(job.status)) {
      return;
    }

    debouncedStoreUpdater.scheduleUpdate(job, updateJob);
  }, [updateJob, networkHealthy, jobs]);

  // Stable job memoization
  const stableJobs = useMemo(() => {
    const currentJobsHash = jobs.map(j => `${j.id}:${j.status}:${j.request_counts?.completed || 0}`).join('|');
    if (lastJobsRef.current === currentJobsHash) {
      return jobs;
    }
    lastJobsRef.current = currentJobsHash;
    return [...jobs];
  }, [jobs]);

  // Initialize optimizations and cleanup
  const largeJobOptimization = useLargeJobOptimization();
  const { performCleanup, forceCleanup } = useUnifiedCleanup({ maxJobs: 50 });
  const { syncJobStatus, syncAllJobStatuses } = useJobStatusSync({ onJobUpdate: debouncedUpdateJob });

  // Replace multiple polling systems with unified orchestrator
  const { pollingStates, manualRefresh, isHealthy: pollingHealthy } = useUnifiedPollingOrchestrator(
    stableJobs.filter(job => networkHealthy && performanceStable), // Only poll when healthy
    debouncedUpdateJob
  );

  // Real-time handler with network awareness
  useBatchJobRealtimeHandler({ 
    onJobUpdate: networkHealthy ? debouncedUpdateJob : () => {} 
  });

  // Simplified batch job actions without redundant polling
  const batchJobActions = useBatchJobActions({
    jobs: stableJobs,
    payeeRowDataMap: payeeDataMap,
    onJobUpdate: debouncedUpdateJob,
    onJobComplete: () => {}
  });

  // Download and actions handlers
  const { handleDownload } = useBatchJobDownloadHandler({ payeeDataMap });
  const { handleCancel, handleJobDelete: baseHandleJobDelete } = useBatchJobActionsHandler();

  // Optimized handlers
  const handleJobDelete = useCallback((jobId: string) => {
    if (!networkHealthy) return;
    baseHandleJobDelete(jobId, removeJob);
  }, [baseHandleJobDelete, removeJob, networkHealthy]);

  const handleRefreshJob = useCallback(async (jobId: string) => {
    if (!networkHealthy || !performanceStable) {
      console.warn('[BATCH JOB MANAGER] Skipping refresh - system not healthy');
      return;
    }
    await manualRefresh(jobId);
  }, [manualRefresh, networkHealthy, performanceStable]);

  // Simplified stalled job detection
  const stalledJobActions = useMemo(() => {
    if (!networkHealthy || !performanceStable) return {};
    
    return stableJobs.reduce((acc, job) => {
      try {
        if (batchJobActions.getStalledJobActions) {
          const stalledAction = batchJobActions.getStalledJobActions(job);
          if (stalledAction) {
            acc[job.id] = stalledAction;
          }
        }
      } catch (error) {
        console.warn(`[BATCH JOB MANAGER] Error detecting stalled job ${job.id}:`, error);
      }
      return acc;
    }, {} as Record<string, any>);
  }, [stableJobs, batchJobActions.getStalledJobActions, networkHealthy, performanceStable]);

  // Memoized return object with health status
  return useMemo(() => ({
    jobs: stableJobs,
    payeeDataMap,
    refreshingJobs: new Set<string>(), // Simplified - use unified polling state
    pollingStates,
    autoPollingJobs: new Set<string>(), // Managed by unified orchestrator
    stalledJobActions,
    handleRefreshJob,
    handleForceRefresh: batchJobActions.handleForceRefresh,
    handleForceStatusSync: batchJobActions.handleForceStatusSync,
    handleDownloadResults: batchJobActions.handleDownloadResults,
    handleCancelJob: batchJobActions.handleCancelJob,
    handleDownload,
    handleCancel,
    handleJobDelete,
    largeJobOptimization,
    performCleanup,
    forceCleanup,
    syncJobStatus,
    syncAllJobStatuses,
    // Health monitoring
    networkHealthy,
    performanceStable,
    pollingHealthy,
    TimeoutManager: BatchJobTimeoutManager
  }), [
    stableJobs,
    payeeDataMap,
    pollingStates,
    stalledJobActions,
    handleRefreshJob,
    batchJobActions,
    handleDownload,
    handleCancel,
    handleJobDelete,
    largeJobOptimization,
    performCleanup,
    forceCleanup,
    syncJobStatus,
    syncAllJobStatuses,
    networkHealthy,
    performanceStable,
    pollingHealthy
  ]);
};