
import React from 'react';
import { Clock, Zap } from 'lucide-react';
import { useDownloadProgress } from '@/contexts/DownloadProgressContext';

interface DownloadStatusDisplayProps {
  hasPreGeneratedFiles: boolean;
  isProcessing: boolean;
  processingSummary: any;
  fileSizeBytes?: number;
  fileGeneratedAt?: string;
  jobId?: string;
}

const DownloadStatusDisplay = ({
  hasPreGeneratedFiles,
  isProcessing,
  processingSummary,
  fileSizeBytes,
  fileGeneratedAt,
  jobId
}: DownloadStatusDisplayProps) => {
  const { getActiveDownloads } = useDownloadProgress();
  const activeDownloads = getActiveDownloads();
  const hasActiveDownloads = activeDownloads.length > 0;
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb > 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="text-xs text-muted-foreground mt-2 space-y-1">
      <p>CSV and Excel files include SIC codes and descriptions for business classifications.</p>
      
      {/* Download status indicator */}
      {hasPreGeneratedFiles ? (
        <div className="flex items-center gap-2 text-green-600 font-medium">
          <Zap className="h-3 w-3" />
          <span>
            ⚡ Files ready for instant download
            {fileSizeBytes && ` (${formatFileSize(fileSizeBytes)})`}
          </span>
          {fileGeneratedAt && (
            <span className="text-xs text-gray-500 ml-2">
              Generated: {formatDate(fileGeneratedAt)}
            </span>
          )}
        </div>
      ) : isProcessing ? (
        <div className="flex items-center gap-2 text-blue-600">
          <Clock className="h-3 w-3" />
          <span>Files will be generated automatically when processing completes</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-blue-600">
          <Clock className="h-3 w-3" />
          <span>Files are being generated automatically...</span>
        </div>
      )}
      
      
      {hasActiveDownloads && (
        <p className="text-blue-600">
          {activeDownloads.length} download(s) in progress. Check the download panel for details.
        </p>
      )}
    </div>
  );
};

export default DownloadStatusDisplay;
