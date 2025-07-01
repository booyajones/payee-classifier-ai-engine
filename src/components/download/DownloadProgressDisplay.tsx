
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { X, Download, Clock, AlertCircle } from 'lucide-react';
import { useDownloadProgress, DownloadState } from '@/contexts/DownloadProgressContext';

const DownloadProgressItem: React.FC<{ download: DownloadState; onCancel: (id: string) => void }> = ({ 
  download, 
  onCancel 
}) => {
  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getProgressColor = () => {
    if (download.error) return 'bg-red-500';
    if (download.progress === 100) return 'bg-green-500';
    return 'bg-blue-500';
  };

  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Download className="h-4 w-4" />
            {download.filename}
          </CardTitle>
          {download.canCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCancel(download.id)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {/* Progress Bar */}
          <div className="relative">
            <Progress value={download.progress} className="h-2" />
            <div 
              className={`absolute top-0 left-0 h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${download.progress}%` }}
            />
          </div>

          {/* Progress Details */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{Math.round(download.progress)}%</span>
            <span>{download.processed}/{download.total} items</span>
          </div>

          {/* Current Stage */}
          <div className="flex items-center gap-1 text-xs">
            {download.error ? (
              <AlertCircle className="h-3 w-3 text-red-500" />
            ) : download.isActive ? (
              <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
            ) : (
              <div className="h-3 w-3 rounded-full bg-green-500" />
            )}
            <span className={download.error ? 'text-red-600' : 'text-muted-foreground'}>
              {download.error || download.stage}
            </span>
          </div>

          {/* Time Estimate */}
          {download.isActive && download.estimatedTimeRemaining && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>~{formatTime(download.estimatedTimeRemaining)} remaining</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const DownloadProgressDisplay: React.FC = () => {
  const { downloads, cancelDownload, clearDownload } = useDownloadProgress();
  const activeDownloads = Object.values(downloads);

  if (activeDownloads.length === 0) {
    return null;
  }

  const handleCancel = (id: string) => {
    cancelDownload(id);
    // Clear cancelled downloads after a short delay
    setTimeout(() => clearDownload(id), 3000);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-h-96 overflow-y-auto">
      <div className="bg-background border rounded-lg shadow-lg p-4">
        <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
          <Download className="h-4 w-4" />
          Downloads ({activeDownloads.length})
        </h3>
        <div className="space-y-2">
          {activeDownloads.map(download => (
            <DownloadProgressItem
              key={download.id}
              download={download}
              onCancel={handleCancel}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DownloadProgressDisplay;
