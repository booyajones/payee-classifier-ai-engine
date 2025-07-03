// @ts-nocheck
import React from 'react';
import { Zap } from 'lucide-react';
import DirectDatabaseDownload from './DirectDatabaseDownload';

interface DownloadStatus {
  status: 'instant' | 'processing' | 'unavailable' | 'checking';
  hasFiles: boolean;
  hasResults: boolean;
}

interface BatchJobCompletedDownloadProps {
  jobId: string;
  downloadStatus: DownloadStatus;
  activeDownload: {
    isActive: boolean;
  } | undefined;
  onDownload?: () => void;
  onForceDownload?: () => void;
}

const BatchJobCompletedDownload = ({ 
  jobId,
  downloadStatus, 
  activeDownload, 
  onDownload,
  onForceDownload
}: BatchJobCompletedDownloadProps) => {
  return (
    <div className="space-y-2 p-3 bg-muted/30 border border-border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-700">✅ CSV Ready - Instant Download</span>
        </div>
        
        <DirectDatabaseDownload 
          jobId={jobId}
          className="text-sm px-3 py-1"
        />
      </div>
      
      <div className="text-xs text-green-600 font-medium">
        ✓ Pre-processed CSV file ready for instant download
      </div>
    </div>
  );
};

export default BatchJobCompletedDownload;
