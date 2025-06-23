
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, X, Trash2 } from 'lucide-react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';

interface BatchJobActionsProps {
  job: BatchJob;
  isCompleted: boolean;
  isRefreshing: boolean;
  isDownloading: boolean;
  isPolling: boolean;
  onRefresh: () => void;
  onDownload: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

const BatchJobActions = ({
  job,
  isCompleted,
  isRefreshing,
  isDownloading,
  isPolling,
  onRefresh,
  onDownload,
  onCancel,
  onDelete
}: BatchJobActionsProps) => {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isRefreshing || isPolling}
      >
        <RefreshCw className={`h-3 w-3 mr-1 ${(isRefreshing || isPolling) ? 'animate-spin' : ''}`} />
        Refresh
      </Button>

      {job.status === 'completed' && !isCompleted && (
        <Button
          variant="default"
          size="sm"
          onClick={onDownload}
          disabled={isDownloading}
        >
          <Download className={`h-3 w-3 mr-1 ${isDownloading ? 'animate-pulse' : ''}`} />
          Download
        </Button>
      )}

      {['validating', 'in_progress', 'finalizing'].includes(job.status) && (
        <Button
          variant="destructive"
          size="sm"
          onClick={onCancel}
        >
          <X className="h-3 w-3 mr-1" />
          Cancel
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default BatchJobActions;
