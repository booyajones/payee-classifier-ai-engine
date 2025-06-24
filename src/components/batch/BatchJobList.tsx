
import React from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { useBatchJobActions } from './useBatchJobActions';
import BatchJobCard from './BatchJobCard';

interface BatchJobListProps {
  jobs: BatchJob[];
  payeeRowDataMap: Record<string, PayeeRowData>;
  onJobUpdate: (job: BatchJob) => void;
  onJobComplete: (results: any[], summary: any, jobId: string) => void;
  onJobDelete: (jobId: string) => void;
}

const BatchJobList = ({ 
  jobs, 
  payeeRowDataMap, 
  onJobUpdate, 
  onJobComplete, 
  onJobDelete 
}: BatchJobListProps) => {
  console.log(`[BATCH JOB LIST] Rendering ${jobs.length} jobs`);

  const {
    refreshingJobs,
    downloadingJobs,
    downloadProgress,
    pollingStates,
    handleRefreshJob,
    handleDownloadResults,
    handleCancelDownload,
    handleCancelJob
  } = useBatchJobActions({
    jobs,
    payeeRowDataMap,
    onJobUpdate,
    onJobComplete
  });

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8 border rounded-md">
        <p className="text-muted-foreground">No batch jobs found. Upload a file to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => {
        const payeeData = payeeRowDataMap[job.id];
        const payeeCount = payeeData?.uniquePayeeNames?.length || 0;
        const isRefreshing = refreshingJobs.has(job.id);
        const isDownloading = downloadingJobs.has(job.id);
        const isPolling = pollingStates[job.id]?.isPolling || false;
        const progress = downloadProgress[job.id];

        return (
          <BatchJobCard
            key={`${job.id}-${job.status}-${job.request_counts.completed}`}
            job={job}
            payeeCount={payeeCount}
            payeeData={payeeData}
            isRefreshing={isRefreshing}
            isDownloading={isDownloading}
            isPolling={isPolling}
            progress={progress}
            onRefresh={() => handleRefreshJob(job.id)}
            onDownload={() => handleDownloadResults(job)}
            onCancel={() => handleCancelDownload(job.id)}
            onDelete={() => onJobDelete(job.id)}
          />
        );
      })}
    </div>
  );
};

export default BatchJobList;
