import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface BatchJobActiveDownloadProps {
  activeDownload: {
    isActive: boolean;
    progress: number;
    stage: string;
    processed: number;
    total: number;
  } | undefined;
}

const BatchJobActiveDownload = ({ activeDownload }: BatchJobActiveDownloadProps) => {
  if (!activeDownload || !activeDownload.isActive) return null;

  return (
    <div className="space-y-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span className="font-medium">Downloading...</span>
        </div>
        <span className="text-muted-foreground">{Math.round(activeDownload.progress)}%</span>
      </div>
      <Progress value={activeDownload.progress} className="h-2" />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{activeDownload.stage}</span>
        <span>{activeDownload.processed}/{activeDownload.total} items</span>
      </div>
    </div>
  );
};

export default BatchJobActiveDownload;
