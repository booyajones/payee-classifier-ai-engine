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
}

const BatchJobCompletedDownload = ({ 
  downloadStatus, 
  activeDownload, 
  onDownload 
}: BatchJobCompletedDownloadProps) => {
  return (
    <div className="space-y-2 p-3 bg-muted/30 border border-border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {downloadStatus.status === 'instant' ? (
            <>
              <Zap className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">⚡ Instant Download Ready</span>
            </>
          ) : downloadStatus.status === 'processing' ? (
            <>
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">⏳ Preparing Files...</span>
            </>
          ) : downloadStatus.status === 'checking' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Checking status...</span>
            </>
          ) : (
            <>
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">⏳ Auto-Processing...</span>
            </>
          )}
        </div>
        
        <Button 
          onClick={onDownload} 
          size="sm" 
          className="flex items-center gap-2"
          variant={downloadStatus.status === 'instant' ? "default" : "outline"}
          disabled={activeDownload?.isActive || downloadStatus.status === 'checking'}
        >
          {downloadStatus.status === 'instant' ? (
            <><Zap className="h-4 w-4" />Instant Download</>
          ) : (
            <><Download className="h-4 w-4" />Download</>
          )}
        </Button>
      </div>
      
      {downloadStatus.status === 'processing' && (
        <div className="text-xs text-muted-foreground">
          Files: {downloadStatus.hasFiles ? '✓' : '⏳'} | 
          Results: {downloadStatus.hasResults ? '✓' : '⏳'}
        </div>
      )}
    </div>
  );
};

export default BatchJobCompletedDownload;