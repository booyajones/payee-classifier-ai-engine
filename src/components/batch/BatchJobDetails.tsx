
// @ts-nocheck
import React from 'react';
import { AlertCircle } from 'lucide-react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import BatchJobPayeeStats from './BatchJobPayeeStats';

interface BatchJobDetailsProps {
  job: BatchJob;
  payeeData?: PayeeRowData;
  lastError?: string;
}

const BatchJobDetails = ({ job, payeeData, lastError }: BatchJobDetailsProps) => {
  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground space-y-1 bg-gray-50 p-2 rounded">
        <div>Created: {new Date(job.created_at * 1000).toLocaleString()}</div>
        {job.in_progress_at && (
          <div>Started: {new Date(job.in_progress_at * 1000).toLocaleString()}</div>
        )}
        {job.completed_at && (
          <div>Completed: {new Date(job.completed_at * 1000).toLocaleString()}</div>
        )}
        <div>Requests: {job.request_counts.completed}/{job.request_counts.total} 
          {job.request_counts.failed > 0 && ` (${job.request_counts.failed} failed)`}
        </div>
      </div>

      <BatchJobPayeeStats payeeData={payeeData} />

      {lastError && (
        <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{lastError}</span>
        </div>
      )}
    </div>
  );
};

export default BatchJobDetails;
