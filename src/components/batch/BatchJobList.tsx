
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EyeOff, Eye } from 'lucide-react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import BatchJobCard from './BatchJobCard';

interface BatchJobListProps {
  jobs: BatchJob[];
  payeeRowDataMap: Record<string, PayeeRowData>;
  refreshingJobs: Set<string>;
  downloadingJobs: Set<string>;
  downloadProgress: Record<string, { current: number; total: number }>;
  pollingStates: Record<string, { isPolling: boolean; lastError?: string }>;
  processedJobs: Set<string>;
  processingInProgress: Set<string>;
  onRefresh: (jobId: string) => void;
  onDownload: (jobId: string) => void;
  onCancel: (jobId: string) => void;
  onDelete: (jobId: string) => void;
  getSmartState: (jobId: string) => any;
  updateProgress: (id: string, stage: string, percentage: number, message?: string, jobId?: string) => void;
}

const BatchJobList = ({
  jobs,
  payeeRowDataMap,
  refreshingJobs,
  downloadingJobs,
  downloadProgress,
  pollingStates,
  processedJobs,
  processingInProgress,
  onRefresh,
  onDownload,
  onCancel,
  onDelete,
  getSmartState,
  updateProgress
}: BatchJobListProps) => {
  const [hideFinishedJobs, setHideFinishedJobs] = useState(false);

  const sortedJobs = [...jobs].sort((a, b) => {
    const dateA = new Date(a.created_at * 1000).getTime();
    const dateB = new Date(b.created_at * 1000).getTime();
    return dateB - dateA;
  });

  const filteredJobs = hideFinishedJobs 
    ? sortedJobs.filter(job => !['completed', 'failed', 'expired', 'cancelled', 'cancelling'].includes(job.status))
    : sortedJobs;

  const finishedJobsCount = sortedJobs.length - sortedJobs.filter(job => !['completed', 'failed', 'expired', 'cancelled', 'cancelling'].includes(job.status)).length;

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
          const isProcessing = processingInProgress.has(job.id);
          
          const smartState = getSmartState(job.id);
          const customProgress = smartState.isProcessing ? {
            stage: smartState.currentStage,
            percentage: smartState.progress,
            isActive: smartState.isProcessing
          } : undefined;
          
          if (isJobDownloading && progress) {
            const downloadPercentage = Math.round((progress.current / progress.total) * 100);
            updateProgress(`job-${job.id}`, `Downloading results: ${progress.current}/${progress.total}`, downloadPercentage, `Processing results: ${progress.current}/${progress.total}`, job.id);
          }
          
          return (
            <BatchJobCard
              key={job.id}
              job={job}
              payeeCount={payeeCount}
              isRefreshing={isJobRefreshing}
              isDownloading={isJobDownloading || isProcessing}
              isPolling={pollingState?.isPolling || false}
              progress={progress}
              customProgress={customProgress}
              lastError={pollingState?.lastError}
              onRefresh={onRefresh}
              onDownload={onDownload}
              onCancel={onCancel}
              onDelete={onDelete}
              isCompleted={isProcessed}
            />
          );
        })
      )}
    </div>
  );
};

export default BatchJobList;
