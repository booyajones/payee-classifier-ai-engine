
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import BatchJobList from './BatchJobList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PerformanceCircuitBreaker } from '@/components/performance/PerformanceCircuitBreaker';
import { useMemoryManager } from '@/lib/performance/memoryManager';


interface BatchJobContainerProps {
  jobs: BatchJob[];
  payeeRowDataMap: Record<string, PayeeRowData>;
  refreshingJobs: Set<string>;
  pollingStates: Record<string, any>;
  stalledJobActions?: Record<string, any>;
  largeJobOptimization?: any;
  onRefresh: (jobId: string, silent?: boolean) => Promise<void>;
  onForceSync?: (jobId: string) => Promise<BatchJob>; // EMERGENCY FIX
  onDownload: (job: BatchJob) => Promise<void>;
  onCancel: (jobId: string) => void;
  onJobDelete: (jobId: string) => void;
}

const BatchJobContainer = ({
  jobs,
  payeeRowDataMap,
  refreshingJobs,
  pollingStates,
  stalledJobActions = {},
  largeJobOptimization,
  onRefresh,
  onForceSync,
  onDownload,
  onCancel,
  onJobDelete
}: BatchJobContainerProps) => {
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const { toast } = useToast();

  // PERFORMANCE: Memory management for large numbers of jobs
  const { forceCleanup, getMemoryUsage } = useMemoryManager(
    jobs,
    (cleanedJobs) => {
      if (cleanedJobs.length !== jobs.length) {
        console.log(`[MEMORY MANAGER] Cleaned up ${jobs.length - cleanedJobs.length} old jobs`);
        // Note: In a real implementation, we'd need to call a parent callback here
        // For now, we'll log the cleanup but the parent manages the actual state
      }
    },
    { maxCompletedJobs: 15, maxJobAgeHours: 48 } // More aggressive cleanup
  );

  const handleRefreshAll = async () => {
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
  };

  const activeJobs = jobs.filter(job => 
    ['validating', 'in_progress', 'finalizing'].includes(job.status)
  );

  const stalledJobs = jobs.filter(job => stalledJobActions[job.id]?.isStalled);

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
        <BatchJobList
          jobs={jobs}
          payeeRowDataMap={payeeRowDataMap}
          refreshingJobs={refreshingJobs}
          pollingStates={pollingStates}
          stalledJobActions={stalledJobActions}
          onRefresh={onRefresh}
          onForceSync={onForceSync}
          onDownload={onDownload}
          onCancel={onCancel}
          onJobDelete={onJobDelete}
        />
      </PerformanceCircuitBreaker>
    </div>
  );
};

export default BatchJobContainer;
