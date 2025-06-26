
import React from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import BatchJobCard from './BatchJobCard';
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
        const pollingState = pollingStates[job.id];
        
        // Check if job is effectively complete (completed OR 100% done in finalizing)
        const isEffectivelyComplete = job.status === 'completed' || 
          (job.request_counts.total > 0 && 
           job.request_counts.completed === job.request_counts.total && 
           job.status === 'finalizing');

        return (
          <div key={`${job.id}-${job.status}-${job.request_counts.completed}`} className="space-y-2">
            <BatchJobCard
              job={job}
              payeeRowData={payeeData}
              isRefreshing={isRefreshing}
              isPolling={isPolling}
              pollingState={pollingState}
              onRefresh={() => onRefresh(job.id)}
              onCancel={() => onCancel(job.id)}
              onDelete={() => onJobDelete(job.id)}
              onDownload={() => onDownload(job)}
            />
            
            {/* Download interface for completed OR effectively complete jobs */}
            {isEffectivelyComplete && payeeData && (
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
