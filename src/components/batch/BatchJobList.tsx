
import React from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { useBatchJobActions } from './useBatchJobActions';
import BatchJobCard from './BatchJobCard';
import DirectCSVExport from './DirectCSVExport';

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

  // Robust delete handler with comprehensive error handling
  const handleSafeDelete = (jobId: string) => {
    try {
      console.log(`[BATCH JOB LIST] Attempting to delete job ${jobId}`);
      console.log(`[BATCH JOB LIST] onJobDelete type:`, typeof onJobDelete);
      
      if (typeof onJobDelete === 'function') {
        onJobDelete(jobId);
        console.log(`[BATCH JOB LIST] Successfully called onJobDelete for ${jobId}`);
      } else {
        console.error('[BATCH JOB LIST] onJobDelete is not a function:', onJobDelete);
        throw new Error('Delete function not available');
      }
    } catch (error) {
      console.error('[BATCH JOB LIST] Error deleting job:', error);
    }
  };

  // Robust refresh handler
  const handleSafeRefresh = (jobId: string) => {
    try {
      console.log(`[BATCH JOB LIST] Attempting to refresh job ${jobId}`);
      console.log(`[BATCH JOB LIST] handleRefreshJob type:`, typeof handleRefreshJob);
      
      if (typeof handleRefreshJob === 'function') {
        handleRefreshJob(jobId);
        console.log(`[BATCH JOB LIST] Successfully called handleRefreshJob for ${jobId}`);
      } else {
        console.error('[BATCH JOB LIST] handleRefreshJob is not a function:', handleRefreshJob);
        throw new Error('Refresh function not available');
      }
    } catch (error) {
      console.error('[BATCH JOB LIST] Error refreshing job:', error);
    }
  };

  // Robust cancel handler
  const handleSafeCancel = (jobId: string) => {
    try {
      console.log(`[BATCH JOB LIST] Attempting to cancel job ${jobId}`);
      
      if (typeof handleCancelJob === 'function') {
        handleCancelJob(jobId);
        console.log(`[BATCH JOB LIST] Successfully called handleCancelJob for ${jobId}`);
      } else {
        console.error('[BATCH JOB LIST] handleCancelJob is not a function:', handleCancelJob);
        throw new Error('Cancel function not available');
      }
    } catch (error) {
      console.error('[BATCH JOB LIST] Error cancelling job:', error);
    }
  };

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
          <div key={`${job.id}-${job.status}-${job.request_counts.completed}`} className="space-y-2">
            <BatchJobCard
              job={job}
              payeeCount={payeeCount}
              payeeData={payeeData}
              isRefreshing={isRefreshing}
              isDownloading={isDownloading}
              isPolling={isPolling}
              progress={progress}
              onRefresh={() => handleSafeRefresh(job.id)}
              onDownload={() => handleDownloadResults(job)}
              onCancel={() => handleSafeCancel(job.id)}
              onDelete={() => handleSafeDelete(job.id)}
            />
            
            {/* Single download interface for completed jobs */}
            {job.status === 'completed' && payeeData && (
              <DirectCSVExport 
                job={job}
                payeeData={payeeData}
                onDownloadResults={() => handleDownloadResults(job)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BatchJobList;
