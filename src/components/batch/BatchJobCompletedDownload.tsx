import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Zap, Clock } from 'lucide-react';

interface DownloadStatus {
  status: 'instant' | 'processing' | 'unavailable' | 'checking';
  hasFiles: boolean;
  hasResults: boolean;
}

interface BatchJobCompletedDownloadProps {
  downloadStatus: DownloadStatus;
  activeDownload: {
    isActive: boolean;
  } | undefined;
  onDownload: () => void;
  onForceDownload?: () => void;
}

const BatchJobCompletedDownload = ({ 
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
          <span className="text-sm font-medium text-green-700">✅ Files Ready - Click Download</span>
        </div>
        
        <Button 
          onClick={onDownload} 
          size="sm" 
          className="flex items-center gap-2"
          disabled={activeDownload?.isActive}
        >
          <Download className="h-4 w-4" />
          Download Files
        </Button>
      </div>
      
      <div className="text-xs text-green-600 font-medium">
        ✓ CSV and Excel files are ready for immediate download
      </div>
    </div>
  );
};

export default BatchJobCompletedDownload;