import React from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import DownloadStatusDisplay from './DownloadStatusDisplay';

interface BatchJobFinalizingDownloadProps {
  job: BatchJob;
  activeDownload?: {
    isActive: boolean;
  } | undefined;
  onDownload?: () => void;
  onRefresh?: () => void;
}

const BatchJobFinalizingDownload = ({ 
  job, 
  activeDownload, 
  onRefresh 
}: BatchJobFinalizingDownloadProps) => {
  const { total, completed } = job.request_counts;
  
  // Check if job is effectively complete (100% done OR officially completed)
  const isEffectivelyComplete = job.status === 'completed' || 
    (total > 0 && completed === total && job.status === 'finalizing');

  // Show download status for completed jobs
  if (!isEffectivelyComplete || activeDownload?.isActive) {
    return null;
  }

  return (
    <DownloadStatusDisplay 
      jobId={job.id}
      onRefresh={onRefresh}
    />
  );
};

export default BatchJobFinalizingDownload;