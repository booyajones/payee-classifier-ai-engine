
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import BatchJobList from './BatchJobList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface BatchJobContainerProps {
  jobs: BatchJob[];
  payeeRowDataMap: Record<string, PayeeRowData>;
  refreshingJobs: Set<string>;
  pollingStates: Record<string, any>;
  onRefresh: (jobId: string, silent?: boolean) => Promise<void>;
  onDownload: (job: BatchJob) => Promise<void>;
  onCancel: (jobId: string) => void;
  onJobDelete: (jobId: string) => void;
}

const BatchJobContainer = ({
  jobs,
  payeeRowDataMap,
  refreshingJobs,
  pollingStates,
  onRefresh,
  onDownload,
  onCancel,
  onJobDelete
}: BatchJobContainerProps) => {
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);

  console.log('[BATCH CONTAINER] Rendering with', jobs.length, 'jobs, isLoaded: true');

  const handleRefreshAll = async () => {
    setIsRefreshingAll(true);
    try {
      console.log('[BATCH CONTAINER] Refreshing all jobs manually');
      const refreshPromises = jobs.map(job => onRefresh(job.id, false));
      await Promise.all(refreshPromises);
    } catch (error) {
      console.error('[BATCH CONTAINER] Error refreshing all jobs:', error);
    } finally {
      setIsRefreshingAll(false);
    }
  };

  const activeJobs = jobs.filter(job => 
    ['validating', 'in_progress', 'finalizing'].includes(job.status)
  );

  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Batch Jobs</CardTitle>
          <CardDescription>
            Upload a file to create your first batch job
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Batch Jobs ({jobs.length})</h3>
          {activeJobs.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {activeJobs.length} active job{activeJobs.length !== 1 ? 's' : ''} running
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshAll}
          disabled={isRefreshingAll}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingAll ? 'animate-spin' : ''}`} />
          Refresh All
        </Button>
      </div>

      <BatchJobList
        jobs={jobs}
        payeeRowDataMap={payeeRowDataMap}
        refreshingJobs={refreshingJobs}
        pollingStates={pollingStates}
        onRefresh={onRefresh}
        onDownload={onDownload}
        onCancel={onCancel}
        onJobDelete={onJobDelete}
      />
    </div>
  );
};

export default BatchJobContainer;
