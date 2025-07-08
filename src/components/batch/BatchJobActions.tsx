
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X, Trash2 } from 'lucide-react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';

interface BatchJobActionsProps {
  job: BatchJob;
  isCompleted: boolean;
  isRefreshing: boolean;
  isDownloading: boolean;
  isPolling: boolean;
  isAutoPolling?: boolean; // Separate state for auto-polling
  onRefresh: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

const BatchJobActions = ({
  job,
  isCompleted,
  isRefreshing,
  isPolling,
  isAutoPolling = false,
  onRefresh,
  onCancel,
  onDelete
}: BatchJobActionsProps) => {
  
  // Safe handler wrappers with better error handling and validation
  const safeRefresh = () => {
    try {
      console.log(`[BATCH ACTIONS] Refreshing job ${job.id}`);
      if (typeof onRefresh === 'function') {
        onRefresh();
      } else {
        console.error('[BATCH ACTIONS] onRefresh is not a function:', typeof onRefresh);
        throw new Error('Refresh function not available');
      }
    } catch (error) {
      console.error('[BATCH ACTIONS] Error in refresh:', error);
    }
  };

  const safeCancel = () => {
    try {
      console.log(`[BATCH ACTIONS] Cancelling job ${job.id}`);
      if (typeof onCancel === 'function') {
        onCancel();
      } else {
        console.error('[BATCH ACTIONS] onCancel is not a function:', typeof onCancel);
        throw new Error('Cancel function not available');
      }
    } catch (error) {
      console.error('[BATCH ACTIONS] Error in cancel:', error);
    }
  };

  const safeDelete = () => {
    try {
      console.log(`[BATCH ACTIONS] Initiating delete for job ${job.id}`);
      
      // Validate onDelete function
      if (typeof onDelete === 'function') {
        console.log(`[BATCH ACTIONS] Calling onDelete for job ${job.id}`);
        onDelete();
      } else {
        console.error('[BATCH ACTIONS] onDelete is not a function:', typeof onDelete);
        throw new Error('Delete function not available');
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
        disabled={isRefreshing}
        className={isAutoPolling ? 'border-blue-300 bg-blue-50/30' : ''}
      >
        <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : isAutoPolling ? 'text-blue-600' : ''}`} />
        {isAutoPolling ? 'Auto' : 'Refresh'}
      </Button>

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
        title="Remove job from list"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default BatchJobActions;
