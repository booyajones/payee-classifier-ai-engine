
import React from 'react';
import { Card } from '@/components/ui/card';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import BatchJobHeader from './BatchJobHeader';
import BatchJobCardContent from './BatchJobCardContent';
import BatchJobActions from './BatchJobActions';
import BatchJobStatusIndicator from './BatchJobStatusIndicator';

interface BatchJobCardProps {
  job: BatchJob;
  payeeRowData?: PayeeRowData;
  isRefreshing?: boolean;
  isPolling?: boolean;
  pollingState?: any;
  onRefresh: () => void;
  onDownload: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

const BatchJobCard = ({
  job,
  payeeRowData,
  isRefreshing = false,
  isPolling = false,
  pollingState,
  onRefresh,
  onDownload,
  onCancel,
  onDelete
}: BatchJobCardProps) => {
  const isCompleted = job.status === 'completed';
  const isActive = ['validating', 'in_progress', 'finalizing'].includes(job.status);
  const lastChecked = pollingState?.lastStatus ? new Date() : undefined;

  return (
    <Card className={`transition-all duration-200 ${isActive ? 'border-blue-200 bg-blue-50/30' : ''}`}>
      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between">
          <BatchJobHeader job={job} payeeRowData={payeeRowData} />
          <BatchJobActions
            job={job}
            isCompleted={isCompleted}
            isRefreshing={isRefreshing}
            isDownloading={false}
            isPolling={isPolling}
            onRefresh={onRefresh}
            onCancel={onCancel}
            onDelete={onDelete}
          />
        </div>

        <BatchJobStatusIndicator
          job={job}
          isPolling={isPolling}
          isRefreshing={isRefreshing}
          lastChecked={lastChecked}
        />

        <BatchJobCardContent
          job={job}
          payeeRowData={payeeRowData}
          isCompleted={isCompleted}
          onDownload={onDownload}
        />
      </div>
    </Card>
  );
};

export default BatchJobCard;
