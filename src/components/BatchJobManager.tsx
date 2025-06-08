
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EyeOff, Eye } from "lucide-react";
import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { PayeeRowData } from "@/lib/rowMapping";
import { useBatchJobActions } from "./batch/useBatchJobActions";
import BatchJobCard from "./batch/BatchJobCard";
import ConfirmationDialog from "./ConfirmationDialog";

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

  const [hideFinishedJobs, setHideFinishedJobs] = useState(false);

  // Track processed jobs to prevent duplicate processing
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
    payeeRowDataMap,
    onJobUpdate,
    onJobComplete: (results, summary, jobId) => {
      // Prevent duplicate processing
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

  // Filter jobs based on hide finished jobs toggle
  const filteredJobs = hideFinishedJobs 
    ? sortedJobs.filter(job => !['completed', 'failed', 'expired', 'cancelled', 'cancelling'].includes(job.status))
    : sortedJobs;

  const finishedJobsCount = sortedJobs.length - sortedJobs.filter(job => !['completed', 'failed', 'expired', 'cancelled', 'cancelling'].includes(job.status)).length;

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
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Batch Jobs</h3>
          
          {finishedJobsCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHideFinishedJobs(!hideFinishedJobs)}
            >
              {hideFinishedJobs ? (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  Show Finished ({finishedJobsCount})
                </>
              ) : (
                <>
                  <EyeOff className="h-3 w-3 mr-1" />
                  Hide Finished ({finishedJobsCount})
                </>
              )}
            </Button>
          )}
        </div>

        {filteredJobs.length === 0 ? (
          <Alert>
            <AlertDescription>
              {hideFinishedJobs 
                ? "No active jobs. Click 'Show Finished' to see completed, cancelled, or failed jobs."
                : "No jobs to display."
              }
            </AlertDescription>
          </Alert>
        ) : (
          filteredJobs.map((job) => {
            const pollingState = pollingStates[job.id];
            const isJobRefreshing = refreshingJobs.has(job.id);
            const isJobDownloading = downloadingJobs.has(job.id);
            const progress = downloadProgress[job.id];
            const payeeRowData = payeeRowDataMap[job.id];
            const payeeCount = payeeRowData?.uniquePayeeNames.length || 0;
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
          })
        )}
      </div>

      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, isOpen: open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.variant === 'destructive' ? 'Remove' : 'Continue'}
      />
    </>
  );
};

export default BatchJobManager;
