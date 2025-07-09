import React from 'react';
import DownloadStatusDisplay from './DownloadStatusDisplay';

interface DownloadStatus {
  status: 'instant' | 'processing' | 'unavailable' | 'checking';
  hasFiles: boolean;
  hasResults: boolean;
}

interface BatchJobCompletedDownloadProps {
  jobId: string;
  downloadStatus?: DownloadStatus;
  activeDownload?: {
    isActive: boolean;
  } | undefined;
  onDownload?: () => void;
  onForceDownload?: () => void;
  onRefresh?: () => void;
}

const BatchJobCompletedDownload = ({ 
  jobId,
  onRefresh
}: BatchJobCompletedDownloadProps) => {
  return (
    <DownloadStatusDisplay 
      jobId={jobId}
      onRefresh={onRefresh}
    />
  );
};

export default BatchJobCompletedDownload;