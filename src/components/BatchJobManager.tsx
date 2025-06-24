
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
import { exportDirectCSV } from "@/lib/classification/batchExporter";
import { useToast } from "@/components/ui/use-toast";

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
  const { toast } = useToast();
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

  // Auto-download CSV when job completes
  const handleJobCompleteWithAutoDownload = useMemo(() => 
    (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => {
      console.log(`[BATCH MANAGER] Job ${jobId} completed, auto-downloading CSV`);
      
      try {
        // Auto-download CSV immediately
        const csvData = exportDirectCSV(summary);
        
        const timestamp = new Date().toISOString().slice(0, 10);
        const csvContent = [
          csvData.headers.join(','),
          ...csvData.rows.map(row => 
            row.map(cell => {
              const value = cell || '';
              return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
                ? `"${value.replace(/"/g, '""')}"` 
                : value;
            }).join(',')
          )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `payee_results_${jobId.slice(-8)}_${timestamp}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "CSV Downloaded",
          description: `Successfully downloaded ${csvData.rows.length} results as CSV.`,
        });

      } catch (error) {
        console.error('[BATCH MANAGER] Auto-download failed:', error);
        toast({
          title: "Download Error",
          description: `Failed to auto-download CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive",
        });
      }

      // Call the original completion handler
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
      );
    }, 
    [baseHandleJobComplete, isJobProcessed, isJobProcessing, markJobAsProcessing, markJobAsProcessed, removeJobFromProcessing, updateProgress, onJobComplete, toast]
  );

  const {
    refreshingJobs,
    pollingStates,
    handleRefreshJob,
    handleDownloadResults,
    handleCancelJob
  } = useBatchJobActions({
    jobs,
    payeeRowDataMap,
    onJobUpdate,
    onJobComplete: handleJobCompleteWithAutoDownload
  });

  useBatchJobAutoPolling({
    jobs,
    autoPollingJobs,
    setAutoPollingJobs,
    handleRefreshJob
  });

  const { recoveringJobs, handleJobRecovery } = useBatchJobRecovery({
    payeeRowDataMap,
    onJobComplete: handleJobCompleteWithAutoDownload
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
