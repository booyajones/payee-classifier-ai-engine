import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import BatchJobCard from './BatchJobCard';

interface VirtualizedBatchJobListProps {
  jobs: BatchJob[];
  payeeRowDataMap: Record<string, PayeeRowData>;
  refreshingJobs: Set<string>;
  pollingStates: Record<string, any>;
  autoPollingJobs: Set<string>; // Track auto-polling jobs
  stalledJobActions?: Record<string, any>;
  autoRefreshHealthy?: boolean;
  onRefresh: (jobId: string, silent?: boolean) => Promise<void>;
  onForceRefresh?: (jobId: string) => Promise<void>; // FORCE REFRESH: Debug capability
  onForceSync?: (jobId: string) => Promise<BatchJob>; // EMERGENCY FIX
  onDownload: (job: BatchJob) => Promise<void>;
  onCancel: (jobId: string) => void;
  onJobDelete: (jobId: string) => void;
}

const VirtualizedBatchJobList = ({
  jobs,
  payeeRowDataMap,
  refreshingJobs,
  pollingStates,
  autoPollingJobs,
  stalledJobActions = {},
  autoRefreshHealthy,
  onRefresh,
  onForceRefresh,
  onForceSync,
  onDownload,
  onCancel,
  onJobDelete
}: VirtualizedBatchJobListProps) => {
  // PERFORMANCE: Memoize expensive computations
  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      // Sort by status priority, then by creation time
      const statusPriority = { 'in_progress': 0, 'validating': 1, 'finalizing': 2, 'completed': 3, 'failed': 4, 'cancelled': 5, 'expired': 6 };
      const aPriority = statusPriority[a.status as keyof typeof statusPriority] ?? 99;
      const bPriority = statusPriority[b.status as keyof typeof statusPriority] ?? 99;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      return b.created_at - a.created_at; // Newer first
    });
  }, [jobs]);

  // PERFORMANCE: Memoize row renderer to prevent unnecessary re-renders
  const Row = useMemo(() => {
    return React.memo(({ index, style }: { index: number; style: React.CSSProperties }) => {
      const job = sortedJobs[index];
      if (!job) return null;

      const payeeRowData = payeeRowDataMap[job.id];
      const isRefreshing = refreshingJobs.has(job.id);
      const pollingState = pollingStates[job.id];
      const isAutoPolling = autoPollingJobs.has(job.id);
      const stalledJobAction = stalledJobActions[job.id];

      return (
        <div style={style} className="px-1 py-1">
          <BatchJobCard
            job={job}
            payeeRowData={payeeRowData}
            isRefreshing={isRefreshing}
            isPolling={Boolean(pollingState)}
            isAutoPolling={isAutoPolling}
            pollingState={pollingState}
            stalledJobActions={stalledJobAction}
            autoRefreshHealthy={autoRefreshHealthy}
            onRefresh={() => onRefresh(job.id)}
            onForceRefresh={onForceRefresh ? () => onForceRefresh(job.id) : undefined}
            onForceSync={onForceSync ? () => onForceSync(job.id) : undefined}
            onDownload={() => onDownload(job)}
            onCancel={() => onCancel(job.id)}
            onDelete={() => onJobDelete(job.id)}
          />
        </div>
      );
    });
  }, [sortedJobs, payeeRowDataMap, refreshingJobs, pollingStates, autoPollingJobs, stalledJobActions, onRefresh, onForceRefresh, onForceSync, onDownload, onCancel, onJobDelete]);

  if (sortedJobs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No batch jobs to display
      </div>
    );
  }

  // PERFORMANCE: Use virtualization for large lists
  const ITEM_HEIGHT = 200; // Approximate height of a job card
  const MAX_HEIGHT = Math.min(800, window.innerHeight * 0.6); // Max 60% of viewport height
  const listHeight = Math.min(sortedJobs.length * ITEM_HEIGHT, MAX_HEIGHT);

  if (sortedJobs.length <= 5) {
    // For small lists, render normally without virtualization
    return (
      <div className="space-y-4">
        {sortedJobs.map((job) => {
          const payeeRowData = payeeRowDataMap[job.id];
          const isRefreshing = refreshingJobs.has(job.id);
          const pollingState = pollingStates[job.id];
          const isAutoPolling = autoPollingJobs.has(job.id);
          const stalledJobAction = stalledJobActions[job.id];

          return (
            <BatchJobCard
              key={`${job.id}-${job.status}-${job.request_counts.completed}`}
              job={job}
              payeeRowData={payeeRowData}
              isRefreshing={isRefreshing}
              isPolling={Boolean(pollingState)}
              isAutoPolling={isAutoPolling}
              pollingState={pollingState}
              stalledJobActions={stalledJobAction}
              autoRefreshHealthy={autoRefreshHealthy}
              onRefresh={() => onRefresh(job.id)}
              onForceRefresh={onForceRefresh ? () => onForceRefresh(job.id) : undefined}
              onForceSync={onForceSync ? () => onForceSync(job.id) : undefined}
              onDownload={() => onDownload(job)}
              onCancel={() => onCancel(job.id)}
              onDelete={() => onJobDelete(job.id)}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground mb-2">
        Showing {sortedJobs.length} jobs (virtualized for performance)
      </div>
      <List
        height={listHeight}
        itemCount={sortedJobs.length}
        itemSize={ITEM_HEIGHT}
        width="100%"
        itemData={sortedJobs}
      >
        {Row}
      </List>
    </div>
  );
};

export default VirtualizedBatchJobList;