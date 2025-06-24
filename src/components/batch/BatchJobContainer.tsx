
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import BatchJobList from './BatchJobList';

interface BatchJobContainerProps {
  jobs: BatchJob[];
  payeeRowDataMap: Record<string, PayeeRowData>;
  refreshingJobs: Set<string>;
  downloadingJobs: Set<string>;
  downloadProgress: Record<string, { current: number; total: number }>;
  pollingStates: Record<string, { isPolling: boolean }>;
  onRefresh: (jobId: string) => Promise<void>;
  onDownload: (job: BatchJob) => Promise<void>;
  onCancel: (jobId: string) => void;
  onJobDelete: (jobId: string) => void;
}

const BatchJobContainer = React.memo(({ 
  jobs, 
  payeeRowDataMap,
  refreshingJobs,
  downloadingJobs,
  downloadProgress,
  pollingStates,
  onRefresh,
  onDownload,
  onCancel,
  onJobDelete
}: BatchJobContainerProps) => {
  console.log(`[BATCH CONTAINER] Rendering ${jobs.length} jobs`);

  if (jobs.length === 0) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription className="flex items-center justify-between">
            <span>No batch jobs found. Upload a file to see jobs here.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="ml-4"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <BatchJobList 
      jobs={jobs}
      payeeRowDataMap={payeeRowDataMap}
      refreshingJobs={refreshingJobs}
      downloadingJobs={downloadingJobs}
      downloadProgress={downloadProgress}
      pollingStates={pollingStates}
      onRefresh={onRefresh}
      onDownload={onDownload}
      onCancel={onCancel}
      onJobDelete={onJobDelete}
    />
  );
});

BatchJobContainer.displayName = 'BatchJobContainer';

export default BatchJobContainer;
