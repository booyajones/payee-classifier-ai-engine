
import React, { useState, useMemo, useCallback } from "react";
import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { PayeeRowData } from "@/lib/rowMapping";
import { useBatchJobActions } from "./batch/useBatchJobActions";
import { useSmartBatchManager } from "@/hooks/useSmartBatchManager";
import { useUnifiedProgress } from "@/contexts/UnifiedProgressContext";
import { useBatchJobState } from "@/hooks/useBatchJobState";
import { useBatchJobTimeout } from "@/hooks/useBatchJobTimeout";
import { useBatchJobAutoPolling } from "./batch/BatchJobAutoPolling";
import { useBatchJobRecovery } from "./batch/BatchJobRecovery";
import { useBatchJobConfirmationDialogs } from "./batch/BatchJobConfirmationDialogs";
import BatchJobList from "./batch/BatchJobList";
import BatchJobConfirmation from "./batch/BatchJobConfirmation";

interface BatchJobManagerProps {
  jobs: BatchJob[];
  payeeRowDataMap: Record<string, PayeeRowData>;
  onJobUpdate: (job: BatchJob) => void;
  onJobComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
  onJobDelete: (jobId: string) => void;
}

const BatchJobManager = React.memo(({ 
  jobs, 
  payeeRowDataMap,
  onJobUpdate, 
  onJobComplete, 
  onJobDelete 
}: BatchJobManagerProps) => {
  const [autoPollingJobs, setAutoPollingJobs] = useState<Set<string>>(new Set());

  const { getSmartState } = useSmartBatchManager();
  const { updateProgress } = useUnifiedProgress();
  const {
    processedJobs,
    processingInProgress,
    markJobAsProcessed,
    markJobAsProcessing,
    removeJobFromProcessing,
    isJobProcessed,
    isJobProcessing
  } = useBatchJobState();

  const {
    getTimeoutState,
    isJobStuck,
    shouldJobTimeout,
    getFormattedElapsedTime
  } = useBatchJobTimeout(jobs);

  // Memoize the completion handler to prevent recreating it on every render
  const handleJobComplete = useCallback((results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => {
    console.log(`[BATCH MANAGER] Job ${jobId} completion handler called with ${results.length} results`);
    
    if (isJobProcessed(jobId)) {
      console.log(`[BATCH MANAGER] Job ${jobId} already processed, ignoring duplicate`);
      return;
    }
    
    if (isJobProcessing(jobId)) {
      console.log(`[BATCH MANAGER] Job ${jobId} processing already in progress, ignoring`);
      return;
    }
    
    markJobAsProcessing(jobId);
    updateProgress(`job-${jobId}`, 'Download complete!', 100, `Successfully processed ${results.length} payees`, jobId);
    
    try {
      if (results.length === 0) {
        console.error(`[BATCH MANAGER] Job ${jobId} completed with 0 results - this is unexpected`);
        return;
      }
      
      const ids = results.map(r => r.id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        console.warn(`[BATCH MANAGER] Job ${jobId} has ${ids.length - uniqueIds.size} duplicate result IDs`);
        
        const seenIds = new Set<string>();
        const deduplicatedResults = results.filter(result => {
          if (seenIds.has(result.id)) {
            return false;
          }
          seenIds.add(result.id);
          return true;
        });
        
        console.log(`[BATCH MANAGER] Deduplicated ${results.length} results to ${deduplicatedResults.length}`);
        results = deduplicatedResults;
      }
      
      const rowIndices = results.map(r => r.rowIndex).filter(idx => idx !== undefined);
      const uniqueRowIndices = new Set(rowIndices);
      if (rowIndices.length !== uniqueRowIndices.size) {
        console.error(`[BATCH MANAGER] Job ${jobId} has duplicate row indices`);
        return;
      }
      
      markJobAsProcessed(jobId);
      onJobComplete(results, summary, jobId);
      console.log(`[BATCH MANAGER] Job ${jobId} processed successfully, marked as completed`);
      
    } finally {
      removeJobFromProcessing(jobId);
    }
  }, [isJobProcessed, isJobProcessing, markJobAsProcessing, updateProgress, markJobAsProcessed, onJobComplete, removeJobFromProcessing]);

  const {
    refreshingJobs,
    downloadingJobs,
    downloadProgress,
    pollingStates,
    handleRefreshJob,
    handleDownloadResults,
    handleCancelJob
  } = useBatchJobActions({
    jobs,
    payeeRowDataMap,
    onJobUpdate,
    onJobComplete: handleJobComplete
  });

  // Use auto-polling hook with stabilized setter
  useBatchJobAutoPolling({
    jobs,
    autoPollingJobs,
    setAutoPollingJobs,
    handleRefreshJob
  });

  const { recoveringJobs, handleJobRecovery } = useBatchJobRecovery({
    payeeRowDataMap,
    onJobComplete: handleJobComplete
  });

  const {
    confirmDialog,
    showCancelConfirmation,
    showDeleteConfirmation,
    closeConfirmDialog
  } = useBatchJobConfirmationDialogs({
    jobs,
    handleCancelJob,
    onJobDelete
  });

  // Memoize the job list props to prevent unnecessary re-renders
  const jobListProps = useMemo(() => ({
    jobs,
    payeeRowDataMap,
    refreshingJobs,
    downloadingJobs,
    downloadProgress,
    pollingStates,
    processedJobs,
    processingInProgress,
    onRefresh: handleRefreshJob,
    onDownload: handleDownloadResults,
    onCancel: showCancelConfirmation,
    onDelete: showDeleteConfirmation,
    getSmartState,
    updateProgress,
    getTimeoutState,
    isJobStuck,
    shouldJobTimeout,
    getFormattedElapsedTime,
    onJobRecovery: handleJobRecovery,
    recoveringJobs,
  }), [
    jobs,
    payeeRowDataMap,
    refreshingJobs,
    downloadingJobs,
    downloadProgress,
    pollingStates,
    processedJobs,
    processingInProgress,
    handleRefreshJob,
    handleDownloadResults,
    showCancelConfirmation,
    showDeleteConfirmation,
    getSmartState,
    updateProgress,
    getTimeoutState,
    isJobStuck,
    shouldJobTimeout,
    getFormattedElapsedTime,
    handleJobRecovery,
    recoveringJobs
  ]);

  console.log(`[BATCH MANAGER] Rendering ${jobs.length} jobs, ${autoPollingJobs.size} auto-polling`);

  return (
    <>
      <BatchJobList {...jobListProps} />

      <BatchJobConfirmation
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirmDialog}
      />
    </>
  );
});

BatchJobManager.displayName = 'BatchJobManager';

export default BatchJobManager;
