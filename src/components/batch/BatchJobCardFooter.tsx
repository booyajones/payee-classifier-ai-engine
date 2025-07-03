
// @ts-nocheck
import React from 'react';
import { Button } from '@/components/ui/button';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import BatchJobActions from './BatchJobActions';

interface BatchJobCardFooterProps {
  job: BatchJob;
  actuallyCompleted: boolean;
  isRefreshing: boolean;
  isPolling: boolean;
  showDetails: boolean;
  onRefresh: () => void;
  onCancel: () => void;
  onDelete: () => void;
  setShowDetails: (show: boolean) => void;
}

const BatchJobCardFooter = ({
  job,
  actuallyCompleted,
  isRefreshing,
  isPolling,
  showDetails,
  onRefresh,
  onCancel,
  onDelete,
  setShowDetails
}: BatchJobCardFooterProps) => {
  return (
    <div className="flex items-center justify-between pt-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowDetails(!showDetails)}
        className="text-muted-foreground"
      >
        {showDetails ? 'Hide' : 'Show'} Details
      </Button>

      <BatchJobActions
        job={job}
        isCompleted={actuallyCompleted}
        isRefreshing={isRefreshing}
        isDownloading={false}
        isPolling={isPolling}
        onRefresh={onRefresh}
        onCancel={onCancel}
        onDelete={onDelete}
      />
    </div>
  );
};

export default BatchJobCardFooter;
