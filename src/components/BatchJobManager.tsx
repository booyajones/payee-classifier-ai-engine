import { useState, useEffect } from "react";
import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { PayeeRowData } from "@/lib/rowMapping";
import { useBatchJobActions } from "./batch/useBatchJobActions";
import { useSmartBatchManager } from "@/hooks/useSmartBatchManager";
import { useUnifiedProgress } from "@/contexts/UnifiedProgressContext";
import { useBatchJobState } from "@/hooks/useBatchJobState";
import { useBatchJobTimeout } from "@/hooks/useBatchJobTimeout";
import { useEnhancedBatchRecovery } from "@/hooks/useEnhancedBatchRecovery";
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
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: 'default' | 'destructive';
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {}
  });

  const [recoveringJobs, setRecoveringJobs] = useState<Set<string>>(new Set());
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

  // Initialize timeout and recovery hooks
  const {
    getTimeoutState,
    isJobStuck,
    shouldJobTimeout,
    getFormattedElapsedTime
  } = useBatchJobTimeout(jobs);

  const { recoverStuckJob } = useEnhancedBatchRecovery();

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

  // Auto-refresh jobs that are in active states
  useEffect(() => {
    const activeStates = ['validating', 'in_progress', 'finalizing'];
    const newAutoPollingJobs = new Set<string>();

    jobs.forEach(job => {
      if (activeStates.includes(job.status) && !autoPollingJobs.has(job.id)) {
        console.log(`[AUTO POLLING] Starting auto-refresh for job ${job.id} with status: ${job.status}`);
        newAutoPollingJobs.add(job.id);
        
        // Start auto-refresh for this job
        const startAutoRefresh = () => {
          const refreshInterval = setInterval(() => {
            const currentJob = jobs.find(j => j.id === job.id);
            if (!currentJob || !activeStates.includes(currentJob.status)) {
              console.log(`[AUTO POLLING] Stopping auto-refresh for job ${job.id} - status: ${currentJob?.status || 'not found'}`);
              clearInterval(refreshInterval);
              setAutoPollingJobs(prev => {
                const newSet = new Set(prev);
                newSet.delete(job.id);
                return newSet;
              });
              return;
            }
            
            console.log(`[AUTO POLLING] Auto-refreshing job ${job.id}`);
            handleRefreshJob(job.id);
          }, 15000); // Refresh every 15 seconds

          // Clean up interval after 30 minutes to prevent infinite polling
          setTimeout(() => {
            console.log(`[AUTO POLLING] Timeout reached for job ${job.id}, stopping auto-refresh`);
            clearInterval(refreshInterval);
            setAutoPollingJobs(prev => {
              const newSet = new Set(prev);
              newSet.delete(job.id);
              return newSet;
            });
          }, 30 * 60 * 1000); // 30 minutes
        };

        startAutoRefresh();
      }
    });

    setAutoPollingJobs(prev => new Set([...prev, ...newAutoPollingJobs]));

    // Cleanup function
    return () => {
      // Intervals are cleaned up by the individual jobs when they complete or timeout
    };
  }, [jobs, handleRefreshJob]);

  const handleJobRecovery = async (job: BatchJob) => {
    const payeeRowData = payeeRowDataMap[job.id];
    if (!payeeRowData) {
      console.error(`[RECOVERY] No payee row data found for job ${job.id}`);
      return;
    }

    setRecoveringJobs(prev => new Set([...prev, job.id]));
    
    try {
      console.log(`[RECOVERY] Starting recovery for job ${job.id}`);
      const success = await recoverStuckJob(job, payeeRowData, onJobComplete);
      
      if (success) {
        console.log(`[RECOVERY] Job ${job.id} recovery completed successfully`);
      } else {
        console.error(`[RECOVERY] Job ${job.id} recovery failed`);
      }
    } catch (error) {
      console.error(`[RECOVERY] Error during job ${job.id} recovery:`, error);
    } finally {
      setRecoveringJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(job.id);
        return newSet;
      });
    }
  };

  const showCancelConfirmation = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    
    setConfirmDialog({
      isOpen: true,
      title: 'Cancel Batch Job',
      description: `Are you sure you want to cancel this job? This action cannot be undone and you may be charged for completed requests.`,
      onConfirm: () => handleCancelJob(job.id),
      variant: 'destructive'
    });
  };

  const showDeleteConfirmation = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    const jobStatus = job?.status || 'unknown';
    
    let description = '';
    if (jobStatus === 'cancelling') {
      description = 'This job is currently being cancelled. Removing it will hide it from your view but the cancellation will continue on OpenAI\'s side.';
    } else if (['cancelled', 'failed', 'expired'].includes(jobStatus)) {
      description = 'This will remove the job from your list. The job data will no longer be visible, but this does not affect the actual OpenAI batch job.';
    } else if (jobStatus === 'completed') {
      description = 'This will remove the completed job from your list. You can still download results before removing if needed.';
    } else {
      description = 'This will remove the job from your view. This does not cancel or affect the actual OpenAI batch job.';
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Remove Job from List',
      description,
      onConfirm: () => {
        console.log(`[DEBUG] Deleting job ${jobId} from list`);
        onJobDelete(jobId);
      },
      variant: 'destructive'
    });
  };

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
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  );
};

export default BatchJobManager;
