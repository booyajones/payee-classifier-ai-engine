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
  // Determine real status - if we can download, files are ready
  const isReadyForDownload = downloadStatus.hasFiles || downloadStatus.status === 'instant';
  const isActuallyProcessing = downloadStatus.status === 'checking' || 
                               (downloadStatus.status === 'processing' && !downloadStatus.hasFiles);

  return (
    <div className="space-y-2 p-3 bg-muted/30 border border-border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isReadyForDownload ? (
            <>
              <Zap className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">✅ Files Ready - Click Download</span>
            </>
          ) : isActuallyProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Processing files...</span>
            </>
          ) : (
            <>
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">Files not ready yet</span>
            </>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={onDownload} 
            size="sm" 
            className="flex items-center gap-2"
            variant={isReadyForDownload ? "default" : "outline"}
            disabled={activeDownload?.isActive || (!isReadyForDownload && downloadStatus.status === 'checking')}
          >
            {isReadyForDownload ? (
              <><Download className="h-4 w-4" />Download Files</>
            ) : (
              <><Download className="h-4 w-4" />Download</>
            )}
          </Button>
          
          {!isReadyForDownload && onForceDownload && (
            <Button 
              onClick={onForceDownload}
              size="sm" 
              variant="secondary"
              className="flex items-center gap-2"
              disabled={activeDownload?.isActive}
            >
              <Zap className="h-4 w-4" />
              Generate Now
            </Button>
          )}
        </div>
      </div>
      
      {/* Real progress indicators based on actual file status */}
      {downloadStatus.status === 'processing' && !isReadyForDownload && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            File Generation Progress:
          </div>
          <div className="flex gap-4 text-xs">
            <span className={`flex items-center gap-1 ${downloadStatus.hasResults ? 'text-green-600' : 'text-orange-600'}`}>
              {downloadStatus.hasResults ? '✓' : '⏳'} Data Processing
            </span>
            <span className={`flex items-center gap-1 ${downloadStatus.hasFiles ? 'text-green-600' : 'text-orange-600'}`}>
              {downloadStatus.hasFiles ? '✓' : '⏳'} File Generation
            </span>
          </div>
        </div>
      )}
      
      {/* Show actual file availability status */}
      {isReadyForDownload && (
        <div className="text-xs text-green-600 font-medium">
          ✓ CSV and Excel files are ready for immediate download
        </div>
      )}
    </div>
  );
};

export default BatchJobCompletedDownload;