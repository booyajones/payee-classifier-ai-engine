import React, { useMemo, useState } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { AutoRefreshState } from '@/hooks/useUnifiedAutoRefresh';
import BatchJobCard from './BatchJobCard';

interface StalledJobAction {
  isStalled?: boolean;
  suggestions?: string[];
  canCancel?: boolean;
}

interface OptimizedBatchJobListProps {
  jobs: BatchJob[];
  payeeRowDataMap: Record<string, PayeeRowData>;
  refreshingJobs: Set<string>;
  pollingStates: Record<string, AutoRefreshState>;
  autoPollingJobs: Set<string>;
  stalledJobActions: Record<string, StalledJobAction>;
  onRefresh: (jobId: string, silent?: boolean) => Promise<void>;
  onForceRefresh?: (jobId: string) => Promise<void>;
  onForceSync?: (jobId: string) => Promise<BatchJob>;
  onDownload: (job: BatchJob) => Promise<void>;
  onCancel: (jobId: string) => void;
  onJobDelete: (jobId: string) => void;
  autoRefreshHealthy?: boolean;
}

const OptimizedBatchJobList = React.memo(({
  jobs,
  payeeRowDataMap,
  refreshingJobs,
  pollingStates,
  autoPollingJobs,
  stalledJobActions,
  onRefresh,
  onForceRefresh,
  onForceSync,
  onDownload,
  onCancel,
  onJobDelete,
  autoRefreshHealthy = true
}: OptimizedBatchJobListProps) => {
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

  // Memoize job processing for performance
  const processedJobs = useMemo(() => {
    return jobs.map(job => ({
      ...job,
      isRefreshing: refreshingJobs.has(job.id),
      pollingState: pollingStates[job.id],
      isAutoPolling: autoPollingJobs.has(job.id),
      stalledAction: stalledJobActions[job.id],
      payeeData: payeeRowDataMap[job.id]
    }));
  }, [jobs, refreshingJobs, pollingStates, autoPollingJobs, stalledJobActions, payeeRowDataMap]);

  // Toggle job expansion
  const toggleJobExpansion = React.useCallback((jobId: string) => {
    setExpandedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  }, []);

  // Memoized job handlers for each job
  const createJobHandlers = React.useCallback((jobId: string, job: BatchJob) => ({
    onRefresh: (silent?: boolean) => onRefresh(jobId, silent),
    onForceRefresh: onForceRefresh ? () => onForceRefresh(jobId) : undefined,
    onForceSync: onForceSync ? () => onForceSync(jobId) : undefined,
    onDownload: () => onDownload(job),
    onCancel: () => onCancel(jobId),
    onJobDelete: () => onJobDelete(jobId),
    onToggleExpansion: () => toggleJobExpansion(jobId)
  }), [onRefresh, onForceRefresh, onForceSync, onDownload, onCancel, onJobDelete, toggleJobExpansion]);

  // Render optimized job list
  return (
    <div className="space-y-4">
      {processedJobs.map((job) => {
        const handlers = createJobHandlers(job.id, job);
        
        return (
          <BatchJobCard
            key={job.id}
            job={job}
            payeeRowData={job.payeeData}
            isRefreshing={job.isRefreshing}
            pollingState={job.pollingState}
            isAutoPolling={job.isAutoPolling}
            stalledJobActions={job.stalledAction}
            autoRefreshHealthy={autoRefreshHealthy}
            onRefresh={handlers.onRefresh}
            onForceRefresh={handlers.onForceRefresh}
            onForceSync={handlers.onForceSync}
            onDownload={handlers.onDownload}
            onCancel={handlers.onCancel}
            onDelete={handlers.onJobDelete}
          />
        );
      })}
    </div>
  );
});

OptimizedBatchJobList.displayName = 'OptimizedBatchJobList';

export default OptimizedBatchJobList;