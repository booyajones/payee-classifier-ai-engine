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
  
  // Check if job is effectively complete (100% done OR officially completed)
  const isEffectivelyComplete = job.status === 'completed' || 
    (total > 0 && completed === total && job.status === 'finalizing');

  // Show download button for completed jobs with results
  if (!isEffectivelyComplete || activeDownload?.isActive) {
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