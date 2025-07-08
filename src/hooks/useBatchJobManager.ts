import { useState } from 'react';
import { useBatchJobStore } from '@/stores/batchJobStore';
import { useBatchJobActions } from '@/components/batch/useBatchJobActions';
import { useBatchJobAutoPolling } from '@/hooks/batch/useBatchJobAutoPolling';
import { useBatchJobRealtimeHandler } from '@/components/batch/BatchJobRealtimeHandler';
import { useBatchJobDownloadHandler } from '@/components/batch/BatchJobDownloadHandler';
import { useBatchJobActionsHandler } from '@/components/batch/BatchJobActionsHandler';
import { BatchJobTimeoutManager } from '@/components/batch/BatchJobTimeoutManager';

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

  // Handle real-time updates
  useBatchJobRealtimeHandler({ onJobUpdate: updateJob });

  // Use the comprehensive batch job actions system
  const {
    refreshingJobs,
    pollingStates,
    handleRefreshJob,
    handleDownloadResults,
    handleCancelJob,
    getStalledJobActions,
    detectStalledJob
  } = useBatchJobActions({
    jobs,
    payeeRowDataMap: payeeDataMap,
    onJobUpdate: updateJob,
    onJobComplete: () => {} // Handle job completion if needed
  });

  // Initialize auto-polling for active jobs
  useBatchJobAutoPolling({
    jobs,
    autoPollingJobs,
    setAutoPollingJobs,
    handleRefreshJob
  });

  // Download handler
  const { handleDownload } = useBatchJobDownloadHandler({ payeeDataMap });

  // Actions handler
  const { handleCancel, handleJobDelete: baseHandleJobDelete } = useBatchJobActionsHandler();

  // Wrapper for job delete to pass removeJob function
  const handleJobDelete = (jobId: string) => baseHandleJobDelete(jobId, removeJob);

  // Generate stalled job actions for all jobs
  const stalledJobActions = jobs.reduce((acc, job) => {
    const stalledAction = getStalledJobActions(job);
    if (stalledAction) {
      acc[job.id] = stalledAction;
    }
    return acc;
  }, {} as Record<string, any>);

  return {
    jobs,
    payeeDataMap,
    refreshingJobs,
    pollingStates,
    stalledJobActions,
    handleRefreshJob,
    handleDownloadResults,
    handleCancelJob,
    handleDownload,
    handleCancel,
    handleJobDelete,
    // Timeout manager component
    TimeoutManager: BatchJobTimeoutManager
  };
};