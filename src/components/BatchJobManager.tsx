
import React, { useMemo } from "react";
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
import { useBatchJobManagerState } from "@/hooks/useBatchJobManagerState";
import BatchJobContainer from "./batch/BatchJobContainer";
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

  const {
    autoPollingJobs,
    setAutoPollingJobs,
    handleJobComplete: baseHandleJobComplete
  } = useBatchJobManagerState();

  // Memoize the completion handler with all dependencies
  const handleJobComplete = useMemo(() => 
    (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) =>
      baseHandleJobComplete(
        results, 
        summary, 
        jobId,
        isJobProcessed,
        isJobProcessing,
        markJobAsProcessing,
        markJobAsProcessed,
        removeJobFromProcessing,
        updateProgress,
        onJobComplete
      ), 
    [baseHandleJobComplete, isJobProcessed, isJobProcessing, markJobAsProcessing, markJobAsProcessed, removeJobFromProcessing, updateProgress, onJobComplete]
  );

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

  return (
    <>
      <BatchJobContainer 
        jobs={jobs}
        payeeRowDataMap={payeeRowDataMap}
        refreshingJobs={refreshingJobs}
        downloadingJobs={downloadingJobs}
        downloadProgress={downloadProgress}
        pollingStates={pollingStates}
        onRefresh={handleRefreshJob}
        onDownload={handleDownloadResults}
        onCancel={showCancelConfirmation}
        onJobDelete={showDeleteConfirmation}
      />

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
