
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
  
  // Safe handler wrappers with error handling
  const safeRefresh = () => {
    try {
      if (typeof onRefresh === 'function') {
        onRefresh();
      } else {
        console.error('[BATCH ACTIONS] onRefresh is not a function');
      }
    } catch (error) {
      console.error('[BATCH ACTIONS] Error in refresh:', error);
    }
  };

  const safeDownload = () => {
    try {
      if (typeof onDownload === 'function') {
        onDownload();
      } else {
        console.error('[BATCH ACTIONS] onDownload is not a function');
      }
    } catch (error) {
      console.error('[BATCH ACTIONS] Error in download:', error);
    }
  };

  const safeCancel = () => {
    try {
      if (typeof onCancel === 'function') {
        onCancel();
      } else {
        console.error('[BATCH ACTIONS] onCancel is not a function');
      }
    } catch (error) {
      console.error('[BATCH ACTIONS] Error in cancel:', error);
    }
  };

  const safeDelete = () => {
    try {
      console.log(`[BATCH ACTIONS] Attempting to delete job ${job.id}`);
      if (typeof onDelete === 'function') {
        onDelete();
      } else {
        console.error('[BATCH ACTIONS] onDelete is not a function');
      }
    } catch (error) {
      console.error('[BATCH ACTIONS] Error in delete:', error);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={safeRefresh}
        disabled={isRefreshing || isPolling}
      >
        <RefreshCw className={`h-3 w-3 mr-1 ${(isRefreshing || isPolling) ? 'animate-spin' : ''}`} />
        Refresh
      </Button>

      {job.status === 'completed' && !isCompleted && (
        <Button
          variant="default"
          size="sm"
          onClick={safeDownload}
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
          onClick={safeCancel}
        >
          <X className="h-3 w-3 mr-1" />
          Cancel
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={safeDelete}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default BatchJobActions;
