
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import BatchJobTimeoutIndicator from './BatchJobTimeoutIndicator';
import BatchJobHeader from './BatchJobHeader';
import BatchJobProgress from './BatchJobProgress';
import BatchJobDetails from './BatchJobDetails';
import BatchJobActions from './BatchJobActions';

interface BatchJobCardProps {
  job: BatchJob;
  payeeCount: number;
  payeeData?: PayeeRowData;
  isRefreshing: boolean;
  isDownloading: boolean;
  isPolling: boolean;
  progress?: { current: number; total: number };
  customProgress?: {
    stage: string;
    percentage: number;
    isActive: boolean;
  };
  lastError?: string;
  onRefresh: () => void;
  onDownload: () => void;
  onCancel: () => void;
  onDelete: () => void;
  isCompleted?: boolean;
  isStuck?: boolean;
  shouldTimeout?: boolean;
  elapsedTime?: string;
  onRecover?: () => void;
  isRecovering?: boolean;
}

const BatchJobCard = React.memo(({
  job,
  payeeCount,
  payeeData,
  isRefreshing,
  isDownloading,
  isPolling,
  progress,
  customProgress,
  lastError,
  onRefresh,
  onDownload,
  onCancel,
  onDelete,
  isCompleted = false,
  isStuck = false,
  shouldTimeout = false,
  elapsedTime = '',
  onRecover = () => {},
  isRecovering = false
}: BatchJobCardProps) => {
  const [showDetails, setShowDetails] = useState(false);

  // Determine if job is actually completed
  const actuallyCompleted = job.status === 'completed';

  // Memoize status color calculation
  const statusColor = useMemo(() => {
    switch (job.status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'expired': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'in_progress': return shouldTimeout ? 'bg-red-100 text-red-800 border-red-200' : 
                                isStuck ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 
                                'bg-blue-100 text-blue-800 border-blue-200';
      case 'validating': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'finalizing': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, [job.status, shouldTimeout, isStuck]);

  // Memoize status display
  const statusDisplay = useMemo(() => {
    if (shouldTimeout) return 'Stuck';
    if (isStuck && job.status === 'in_progress') return 'Slow Progress';
    return job.status.charAt(0).toUpperCase() + job.status.slice(1).replace('_', ' ');
  }, [job.status, shouldTimeout, isStuck]);

  return (
    <Card className={`transition-all duration-200 ${isCompleted ? 'ring-2 ring-green-200' : ''}`}>
      <CardHeader className="pb-3">
        <BatchJobHeader
          job={job}
          payeeCount={payeeCount}
          isCompleted={isCompleted}
          elapsedTime={elapsedTime}
          statusColor={statusColor}
          statusDisplay={statusDisplay}
        />
      </CardHeader>

      <CardContent className="space-y-3">
        <BatchJobProgress
          job={job}
          isCompleted={isCompleted}
          isDownloading={isDownloading}
          progress={progress}
          customProgress={customProgress}
        />

        <BatchJobTimeoutIndicator
          job={job}
          isStuck={isStuck}
          shouldTimeout={shouldTimeout}
          elapsedTime={elapsedTime}
          onRecover={onRecover}
          isRecovering={isRecovering}
        />

        {showDetails && (
          <BatchJobDetails
            job={job}
            payeeData={payeeData}
            lastError={lastError}
          />
        )}

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
            isDownloading={isDownloading}
            isPolling={isPolling}
            onRefresh={onRefresh}
            onCancel={onCancel}
            onDelete={onDelete}
          />
        </div>
      </CardContent>
    </Card>
  );
});

BatchJobCard.displayName = 'BatchJobCard';

export default BatchJobCard;
