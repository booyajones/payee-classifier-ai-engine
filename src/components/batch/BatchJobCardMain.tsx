
// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import BatchJobCardContent from './BatchJobCardContent';

interface BatchJobCardMainProps {
  job: BatchJob;
  payeeRowData?: PayeeRowData;
  isRefreshing: boolean;
  isPolling: boolean;
  lastError?: string;
  onRefresh: () => void;
  onCancel: () => void;
  onDelete: () => void;
  isCompleted?: boolean;
  isStuck?: boolean;
  shouldTimeout?: boolean;
  elapsedTime?: string;
  onRecover?: () => void;
  isRecovering?: boolean;
  onDownload: () => void;
}

const BatchJobCardMain = React.memo(({
  job,
  payeeRowData,
  isRefreshing,
  isPolling,
  lastError,
  onRefresh,
  onCancel,
  onDelete,
  isCompleted = false,
  isStuck = false,
  shouldTimeout = false,
  elapsedTime = '',
  onRecover = () => {},
  isRecovering = false,
  onDownload
}: BatchJobCardMainProps) => {
  const [showDetails, setShowDetails] = useState(false);

  // Determine if job is actually completed
  const actuallyCompleted = job.status === 'completed';
  const payeeCount = payeeRowData?.uniquePayeeNames?.length || 0;

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
      <BatchJobCardContent
        job={job}
        payeeRowData={payeeRowData}
        isCompleted={actuallyCompleted}
        onDownload={onDownload}
      />
    </Card>
  );
});

BatchJobCardMain.displayName = 'BatchJobCardMain';

export default BatchJobCardMain;
