
import { useState } from "react";
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

const BatchJobManager = ({ 
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

  // Initialize timeout hook
  const {
    getTimeoutState,
    isJobStuck,
    shouldJobTimeout,
    getFormattedElapsedTime
  } = useBatchJobTimeout(jobs);

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
    onJobComplete: (results, summary, jobId) => {
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
    }
  });

  // Use auto-polling hook
  useBatchJobAutoPolling({
    jobs,
    autoPollingJobs,
    setAutoPollingJobs,
    handleRefreshJob
  });

  // Use recovery hook
  const { recoveringJobs, handleJobRecovery } = useBatchJobRecovery({
    payeeRowDataMap,
    onJobComplete
  });

  // Use confirmation dialogs hook
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

  console.log(`[BATCH MANAGER] Rendering ${jobs.length} jobs, ${autoPollingJobs.size} auto-polling`);

  return (
    <>
      <BatchJobList
        jobs={jobs}
        payeeRowDataMap={payeeRowDataMap}
        refreshingJobs={refreshingJobs}
        downloadingJobs={downloadingJobs}
        downloadProgress={downloadProgress}
        pollingStates={pollingStates}
        processedJobs={processedJobs}
        processingInProgress={processingInProgress}
        onRefresh={handleRefreshJob}
        onDownload={handleDownloadResults}
        onCancel={showCancelConfirmation}
        onDelete={showDeleteConfirmation}
        getSmartState={getSmartState}
        updateProgress={updateProgress}
        getTimeoutState={getTimeoutState}
        isJobStuck={isJobStuck}
        shouldJobTimeout={shouldJobTimeout}
        getFormattedElapsedTime={getFormattedElapsedTime}
        onJobRecovery={handleJobRecovery}
        recoveringJobs={recoveringJobs}
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
};

export default BatchJobManager;
