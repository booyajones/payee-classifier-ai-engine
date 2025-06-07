
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { useBatchJobActions } from "./batch/useBatchJobActions";
import BatchJobCard from "./batch/BatchJobCard";
import ConfirmationDialog from "./ConfirmationDialog";

interface BatchJobManagerProps {
  jobs: BatchJob[];
  payeeNamesMap: Record<string, string[]>;
  originalFileDataMap: Record<string, any[]>;
  onJobUpdate: (job: BatchJob) => void;
  onJobComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
  onJobDelete: (jobId: string) => void;
}

const BatchJobManager = ({ 
  jobs, 
  payeeNamesMap, 
  originalFileDataMap,
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

  // FIXED: Track processed jobs to prevent any possibility of duplicate processing
  const [processedJobs, setProcessedJobs] = useState<Set<string>>(new Set());

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
    payeeNamesMap,
    originalFileDataMap,
    onJobUpdate,
    onJobComplete: (results, summary, jobId) => {
      // GUARANTEED NO DUPLICATES: Only process each job exactly once
      if (processedJobs.has(jobId)) {
        console.log(`[BATCH MANAGER] Job ${jobId} already processed, ignoring duplicate`);
        return;
      }
      
      setProcessedJobs(prev => new Set(prev).add(jobId));
      onJobComplete(results, summary, jobId);
      console.log(`[BATCH MANAGER] Job ${jobId} processed successfully, marked as completed`);
    }
  });

  const sortedJobs = [...jobs].sort((a, b) => {
    const dateA = new Date(a.created_at * 1000).getTime();
    const dateB = new Date(b.created_at * 1000).getTime();
    return dateB - dateA;
  });

  const showCancelConfirmation = (jobId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Cancel Batch Job',
      description: `Are you sure you want to cancel this job? This action cannot be undone and you may be charged for completed requests.`,
      onConfirm: () => handleCancelJob(jobId),
      variant: 'destructive'
    });
  };

  const showDeleteConfirmation = (jobId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Job',
      description: `Are you sure you want to remove this job from the list? This will only remove it from your view, not delete the actual job.`,
      onConfirm: () => onJobDelete(jobId),
      variant: 'destructive'
    });
  };

  if (jobs.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No batch jobs found. Submit a batch for processing to see jobs here.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Batch Jobs</h3>
        
        {sortedJobs.map((job) => {
          const pollingState = pollingStates[job.id];
          const isJobRefreshing = refreshingJobs.has(job.id);
          const isJobDownloading = downloadingJobs.has(job.id);
          const progress = downloadProgress[job.id];
          const payeeCount = payeeNamesMap[job.id]?.length || 0;
          const isProcessed = processedJobs.has(job.id);
          
          return (
            <BatchJobCard
              key={job.id}
              job={job}
              payeeCount={payeeCount}
              isRefreshing={isJobRefreshing}
              isDownloading={isJobDownloading}
              isPolling={pollingState?.isPolling || false}
              progress={progress}
              lastError={pollingState?.lastError}
              onRefresh={handleRefreshJob}
              onDownload={handleDownloadResults}
              onCancel={showCancelConfirmation}
              onDelete={showDeleteConfirmation}
              isCompleted={isProcessed}
            />
          );
        })}
      </div>

      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, isOpen: open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.variant === 'destructive' ? 'Delete' : 'Continue'}
      />
    </>
  );
};

export default BatchJobManager;
