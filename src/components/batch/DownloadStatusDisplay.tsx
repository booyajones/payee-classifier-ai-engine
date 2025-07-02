
import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle, AlertCircle, Zap, Loader2 } from 'lucide-react';
import { useDownloadProgress } from '@/contexts/DownloadProgressContext';
import { RetroactiveBatchProcessor } from '@/lib/services/retroactiveBatchProcessor';

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
  const [downloadType, setDownloadType] = useState<'instant' | 'processing' | 'unavailable' | 'loading'>('loading');

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb > 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };

  // Check download type for the job
  useEffect(() => {
    if (jobId) {
      RetroactiveBatchProcessor.getDownloadType(jobId).then(setDownloadType);
    }
  }, [jobId]);

  return (
    <div className="text-xs text-muted-foreground mt-2 space-y-1">
      <p>CSV and Excel files include SIC codes and descriptions for business classifications.</p>
      
      {/* Enhanced download status indicators */}
      {downloadType === 'loading' && (
        <div className="flex items-center gap-2 text-blue-600">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Checking download availability...</span>
        </div>
      )}
      
      {downloadType === 'instant' && (
        <div className="flex items-center gap-2 text-green-600 font-medium">
          <Zap className="h-3 w-3" />
          <span>
            ⚡ Instant download available
            {fileSizeBytes && ` (${formatFileSize(fileSizeBytes)})`}
          </span>
          {fileGeneratedAt && (
            <span className="text-xs text-gray-500 ml-2">
              Generated: {formatDate(fileGeneratedAt)}
            </span>
          )}
        </div>
      )}
      
      {downloadType === 'processing' && (
        <div className="flex items-center gap-2 text-amber-600">
          <Clock className="h-3 w-3" />
          <span>Files will be generated on download (~30-60s first time)</span>
        </div>
      )}
      
      {hasPreGeneratedFiles && downloadType !== 'instant' && (
        <div className="flex items-center gap-2 text-green-600 font-medium">
          <CheckCircle className="h-3 w-3" />
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
      )}

      {!hasPreGeneratedFiles && !isProcessing && processingSummary && (
        <div className="flex items-center gap-2 text-amber-600">
          <AlertCircle className="h-3 w-3" />
          <span>Files will be generated automatically on first download</span>
        </div>
      )}

      {!hasPreGeneratedFiles && isProcessing && (
        <div className="flex items-center gap-2 text-blue-600">
          <Clock className="h-3 w-3" />
          <span>Files will be generated automatically when processing completes</span>
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
