
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import BatchJobHeader from './BatchJobHeader';
import BatchJobCardContent from './BatchJobCardContent';
import BatchJobActions from './BatchJobActions';
import BatchJobStatusIndicator from './BatchJobStatusIndicator';
import LargeJobStatusIndicator from './LargeJobStatusIndicator';
import LargeJobManagementPanel from './LargeJobManagementPanel';

interface BatchJobCardProps {
  job: BatchJob;
  payeeRowData?: PayeeRowData;
  isRefreshing?: boolean;
  isPolling?: boolean;
  pollingState?: any;
  stalledJobActions?: any;
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
  stalledJobActions,
  onRefresh,
  onDownload,
  onCancel,
  onDelete
}: BatchJobCardProps) => {
  const isCompleted = job.status === 'completed';
  const isActive = ['validating', 'in_progress', 'finalizing'].includes(job.status);
  const isStalled = stalledJobActions?.isStalled || false;
  const lastChecked = pollingState?.lastStatus ? new Date() : undefined;
  
  // Determine if this is a large job that needs enhanced handling
  const isLargeJob = job.request_counts.total > 1000;
  const createdTime = new Date(job.created_at * 1000);
  const ageInHours = (Date.now() - createdTime.getTime()) / (1000 * 60 * 60);
  const isLongRunning = ageInHours > 2;

  return (
    <Card className={`transition-all duration-200 ${
      isStalled ? 'border-red-200 bg-red-50/30' : 
      isActive ? 'border-blue-200 bg-blue-50/30' : ''
    }`}>
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

        {isLargeJob || isLongRunning ? (
          <LargeJobStatusIndicator
            job={job}
            isPolling={isPolling}
            isRefreshing={isRefreshing}
            isStalled={isStalled}
            lastChecked={lastChecked}
          />
        ) : (
          <BatchJobStatusIndicator
            job={job}
            isPolling={isPolling}
            isRefreshing={isRefreshing}
            isStalled={isStalled}
            lastChecked={lastChecked}
          />
        )}

        {/* Stalled Job Warning and Actions */}
        {isStalled && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-yellow-800">Job May Be Stalled</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  This job has been processing for over 30 minutes with no progress. 
                  It may be stuck due to an OpenAI API issue.
                </p>
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-yellow-600">Recovery options:</p>
                  <ul className="text-xs text-yellow-600 ml-3 space-y-0.5">
                    {stalledJobActions?.suggestions?.map((suggestion: string, index: number) => (
                      <li key={index}>• {suggestion}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="text-xs"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Force Refresh
                  </Button>
                  {stalledJobActions?.canCancel && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={onCancel}
                      className="text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel & Retry
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <BatchJobCardContent
          job={job}
          payeeRowData={payeeRowData}
          isCompleted={isCompleted}
          onDownload={onDownload}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />

        {/* Enhanced management panel for large jobs */}
        {(isLargeJob || isLongRunning) && isActive && (
          <LargeJobManagementPanel
            job={job}
            onRefresh={onRefresh}
            isPolling={isPolling}
            isRefreshing={isRefreshing}
          />
        )}
      </div>
    </Card>
  );
};

export default BatchJobCard;
