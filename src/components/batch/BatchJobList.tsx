
import React from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import BatchJobCardMain from './BatchJobCardMain';
import DirectCSVExport from './DirectCSVExport';

interface BatchJobListProps {
  jobs: BatchJob[];
  payeeRowDataMap: Record<string, PayeeRowData>;
  refreshingJobs: Set<string>;
  pollingStates: Record<string, { isPolling: boolean }>;
  onRefresh: (jobId: string) => Promise<void>;
  onDownload: (job: BatchJob) => Promise<void>;
  onCancel: (jobId: string) => void;
  onJobDelete: (jobId: string) => void;
}

const BatchJobList = ({ 
  jobs, 
  payeeRowDataMap,
  refreshingJobs,
  pollingStates,
  onRefresh,
  onDownload,
  onCancel,
  onJobDelete
}: BatchJobListProps) => {
  console.log(`[BATCH JOB LIST] Rendering ${jobs.length} jobs`);

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
        const isRefreshing = refreshingJobs.has(job.id);
        const isPolling = pollingStates[job.id]?.isPolling || false;

        return (
          <div key={`${job.id}-${job.status}-${job.request_counts.completed}`} className="space-y-2">
            <BatchJobCardMain
              job={job}
              payeeRowData={payeeData}
              isRefreshing={isRefreshing}
              isPolling={isPolling}
              onRefresh={() => onRefresh(job.id)}
              onCancel={() => onCancel(job.id)}
              onDelete={() => onJobDelete(job.id)}
              onDownload={() => onDownload(job)}
            />
            
            {/* Simple download interface for completed jobs */}
            {job.status === 'completed' && payeeData && (
              <DirectCSVExport 
                job={job}
                payeeData={payeeData}
                onDownloadResults={() => onDownload(job)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BatchJobList;
