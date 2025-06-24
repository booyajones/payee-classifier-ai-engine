
import React from 'react';
import { CardContent, CardHeader } from '@/components/ui/card';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import BatchJobTimeoutIndicator from './BatchJobTimeoutIndicator';
import BatchJobHeader from './BatchJobHeader';
import BatchJobProgress from './BatchJobProgress';
import BatchJobDetails from './BatchJobDetails';
import BatchJobCardFooter from './BatchJobCardFooter';

interface BatchJobCardContentProps {
  job: BatchJob;
  payeeCount: number;
  payeeData?: PayeeRowData;
  isRefreshing: boolean;
  isPolling: boolean;
  lastError?: string;
  onRefresh: () => void;
  onCancel: () => void;
  onDelete: () => void;
  isCompleted: boolean;
  isStuck: boolean;
  shouldTimeout: boolean;
  elapsedTime: string;
  onRecover: () => void;
  isRecovering: boolean;
  actuallyCompleted: boolean;
  statusColor: string;
  statusDisplay: string;
  showDetails: boolean;
  setShowDetails: (show: boolean) => void;
}

const BatchJobCardContent = ({
  job,
  payeeCount,
  payeeData,
  isRefreshing,
  isPolling,
  lastError,
  onRefresh,
  onCancel,
  onDelete,
  isCompleted,
  isStuck,
  shouldTimeout,
  elapsedTime,
  onRecover,
  isRecovering,
  actuallyCompleted,
  statusColor,
  statusDisplay,
  showDetails,
  setShowDetails
}: BatchJobCardContentProps) => {
  return (
    <>
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

        <BatchJobCardFooter
          job={job}
          actuallyCompleted={actuallyCompleted}
          isRefreshing={isRefreshing}
          isPolling={isPolling}
          showDetails={showDetails}
          onRefresh={onRefresh}
          onCancel={onCancel}
          onDelete={onDelete}
          setShowDetails={setShowDetails}
        />
      </CardContent>
    </>
  );
};

export default BatchJobCardContent;
