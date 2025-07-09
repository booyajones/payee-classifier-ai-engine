import React, { useState, useEffect } from 'react';
import { productionLogger } from '@/lib/logging/productionLogger';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { CheckCircle } from 'lucide-react';
import BatchJobProgress from './BatchJobProgress';
import EnhancedBatchJobProgress from './EnhancedBatchJobProgress';
import BatchJobRequestCounts from './BatchJobRequestCounts';
import BatchJobStuckWarning from './BatchJobStuckWarning';
import DownloadStatusDisplay from './DownloadStatusDisplay';
// Enhanced download status display integrated

interface BatchJobCardContentProps {
  job: BatchJob;
  payeeRowData?: PayeeRowData;
  isCompleted: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const BatchJobCardContent = ({
  job,
  payeeRowData,
  isCompleted,
  onRefresh,
  isRefreshing = false
}: BatchJobCardContentProps) => {
  // Determine if this is a large job that needs enhanced progress display
  const isLargeJob = job.request_counts.total > 1000;
  const createdTime = new Date(job.created_at * 1000);
  const ageInHours = (Date.now() - createdTime.getTime()) / (1000 * 60 * 60);
  const isLongRunning = ageInHours > 2;

  return (
    <div className="space-y-3">
      {(isLargeJob || isLongRunning) && job.status === 'in_progress' ? (
        <EnhancedBatchJobProgress 
          job={job} 
          onManualRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
      ) : (
        <BatchJobProgress 
          job={job} 
          onManualRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
      )}
      <BatchJobRequestCounts job={job} />
      <BatchJobStuckWarning job={job} />
      
      {/* Enhanced download status display for completed jobs */}
      {isCompleted && (
        <div className="space-y-2">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">✅ Job completed successfully</span>
            </div>
            <p className="text-xs text-green-600 mt-1">
              {job.request_counts.completed} payees processed • Download ready below
            </p>
          </div>
          
          <DownloadStatusDisplay 
            jobId={job.id}
            onRefresh={onRefresh}
          />
        </div>
      )}
    </div>
  );
};

export default BatchJobCardContent;