
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Zap, RotateCcw } from 'lucide-react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import OptimizedBatchJobList from './OptimizedBatchJobList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PerformanceCircuitBreaker } from '@/components/performance/PerformanceCircuitBreaker';
import { useMemoryManager } from '@/lib/performance/memoryManager';


interface BatchJobContainerProps {
  jobs: BatchJob[];
  payeeRowDataMap: Record<string, PayeeRowData>;
  refreshingJobs: Set<string>;
  pollingStates: Record<string, any>;
  autoPollingJobs: Set<string>; // Track auto-polling jobs
  stalledJobActions?: Record<string, any>;
  largeJobOptimization?: any;
  onRefresh: (jobId: string, silent?: boolean) => Promise<void>;
  onForceRefresh?: (jobId: string) => Promise<void>; // FORCE REFRESH: Debug capability
  onForceSync?: (jobId: string) => Promise<BatchJob>; // EMERGENCY FIX
  onDownload: (job: BatchJob) => Promise<void>;
  onCancel: (jobId: string) => void;
  onJobDelete: (jobId: string) => void;
  onCleanup?: () => void; // Automatic cleanup function
  onForceCleanup?: () => void; // Force performance cleanup function
}

const BatchJobContainer = React.memo(({
  jobs,
  payeeRowDataMap,
  refreshingJobs,
  pollingStates,
  autoPollingJobs,
  stalledJobActions = {},
  largeJobOptimization,
  onRefresh,
  onForceRefresh,
  onForceSync,
  onDownload,
  onCancel,
  onJobDelete,
  onCleanup,
  onForceCleanup
}: BatchJobContainerProps) => {
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const { toast } = useToast();

  // EMERGENCY: Memory management for large numbers of jobs
  const { forceCleanup, getMemoryInfo } = useMemoryManager();

  const handleRefreshAll = React.useCallback(async () => {
    setIsRefreshingAll(true);
    try {
      // Refreshing all jobs manually
      const refreshPromises = jobs.map(job => onRefresh(job.id, false));
      await Promise.all(refreshPromises);
    } catch (error) {
      // Error refreshing jobs - will be handled by individual refresh handlers
    } finally {
      setIsRefreshingAll(false);
    }
  }, [jobs, onRefresh]);

  const activeJobs = useMemo(() => jobs.filter(job => 
    ['validating', 'in_progress', 'finalizing'].includes(job.status)
  ), [jobs]);

  const stalledJobs = useMemo(() => jobs.filter(job => stalledJobActions[job.id]?.isStalled), [jobs, stalledJobActions]);

  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Batch Jobs</CardTitle>
          <CardDescription>
            Upload a file to create your first batch job
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Batch Jobs ({jobs.length})</h3>
            <div className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full border border-green-200">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live Updates</span>
            </div>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            {activeJobs.length > 0 && (
              <span>{activeJobs.length} active job{activeJobs.length !== 1 ? 's' : ''}</span>
            )}
            {stalledJobs.length > 0 && (
              <span className="text-yellow-600 font-medium">
                {stalledJobs.length} stalled job{stalledJobs.length !== 1 ? 's' : ''} ⚠️
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {onForceCleanup && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onForceCleanup();
                toast({
                  title: "Performance Cleanup",
                  description: "Cleared completed jobs from memory",
                });
              }}
            >
              <Zap className="h-4 w-4 mr-2" />
              Cleanup
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isRefreshingAll}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingAll ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
        </div>
      </div>

      {stalledJobs.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <p className="text-sm text-yellow-800 font-medium">
              {stalledJobs.length} job{stalledJobs.length !== 1 ? 's' : ''} may be stalled and need attention
            </p>
          </div>
        </div>
      )}

      <PerformanceCircuitBreaker>
        <OptimizedBatchJobList
          jobs={jobs}
          payeeRowDataMap={payeeRowDataMap}
          refreshingJobs={refreshingJobs}
          pollingStates={pollingStates}
          autoPollingJobs={autoPollingJobs}
          stalledJobActions={stalledJobActions}
          onRefresh={onRefresh}
          onForceRefresh={onForceRefresh}
          onForceSync={onForceSync}
          onDownload={onDownload}
          onCancel={onCancel}
          onJobDelete={onJobDelete}
        />
      </PerformanceCircuitBreaker>
    </div>
  );
});

export default BatchJobContainer;
