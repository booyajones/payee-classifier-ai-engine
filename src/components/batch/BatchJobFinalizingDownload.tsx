// @ts-nocheck
import React from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import DirectDatabaseDownload from './DirectDatabaseDownload';

interface BatchJobFinalizingDownloadProps {
  job: BatchJob;
  activeDownload: {
    isActive: boolean;
  } | undefined;
  onDownload: () => void;
}

const BatchJobFinalizingDownload = ({ 
  job, 
  activeDownload, 
  onDownload 
}: BatchJobFinalizingDownloadProps) => {
  const { total, completed } = job.request_counts;
  
  // Only show download for truly completed jobs (files are guaranteed to be ready)
  const isReadyForDownload = job.status === 'completed';

  // Show download button only for completed jobs with pre-generated files
  if (!isReadyForDownload || activeDownload?.isActive) {
    return null;
  }

  return (
    <div className="flex justify-end">
      <DirectDatabaseDownload 
        jobId={job.id}
        className="text-sm px-3 py-1"
      />
    </div>
  );
};

export default BatchJobFinalizingDownload;
