
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, FileText } from 'lucide-react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import BatchJobList from './BatchJobList';
import RetroactiveBatchFileGenerator from './RetroactiveBatchFileGenerator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { RetroactiveProcessingResult } from '@/lib/services/retroactiveBatchProcessor';

interface BatchJobContainerProps {
  jobs: BatchJob[];
  payeeRowDataMap: Record<string, PayeeRowData>;
  refreshingJobs: Set<string>;
  pollingStates: Record<string, any>;
  stalledJobActions?: Record<string, any>;
  onRefresh: (jobId: string, silent?: boolean) => Promise<void>;
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
  onRefresh,
  onDownload,
  onCancel,
  onJobDelete
}: BatchJobContainerProps) => {
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [showRetroactiveGenerator, setShowRetroactiveGenerator] = useState(false);
  const { toast } = useToast();

  console.log('[BATCH CONTAINER] Rendering with', jobs.length, 'jobs, isLoaded: true');

  const handleRefreshAll = async () => {
    setIsRefreshingAll(true);
    try {
      console.log('[BATCH CONTAINER] Refreshing all jobs manually');
      const refreshPromises = jobs.map(job => onRefresh(job.id, false));
      await Promise.all(refreshPromises);
    } catch (error) {
      console.error('[BATCH CONTAINER] Error refreshing all jobs:', error);
    } finally {
      setIsRefreshingAll(false);
    }
  };

  const activeJobs = jobs.filter(job => 
    ['validating', 'in_progress', 'finalizing'].includes(job.status)
  );

  const stalledJobs = jobs.filter(job => stalledJobActions[job.id]?.isStalled);

  // Find completed jobs without pre-generated files
  const completedJobsWithoutFiles = jobs.filter(job => {
    if (job.status !== 'completed') return false;
    
    // Check if job has pre-generated files (would be shown in metadata or separate check)
    // For this implementation, we'll assume jobs without csv_file_url need processing
    // This would be enhanced with actual database checks
    return job.request_counts.completed > 0;
  });

  const handleRetroactiveComplete = async (results: RetroactiveProcessingResult[]) => {
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    // Refresh the jobs to show updated file status
    await handleRefreshAll();
    
    setShowRetroactiveGenerator(false);
    
    toast({
      title: "File Generation Complete",
      description: `${successCount} jobs now have instant download files${failCount > 0 ? `. ${failCount} jobs failed to process.` : '.'}`,
    });
  };

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

  if (showRetroactiveGenerator) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Generate Pre-Generated Files</h3>
          <Button
            variant="outline"
            onClick={() => setShowRetroactiveGenerator(false)}
          >
            Back to Jobs
          </Button>
        </div>
        <RetroactiveBatchFileGenerator
          jobs={completedJobsWithoutFiles}
          onComplete={handleRetroactiveComplete}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Batch Jobs ({jobs.length})</h3>
          <div className="flex gap-4 text-sm text-muted-foreground">
            {activeJobs.length > 0 && (
              <span>{activeJobs.length} active job{activeJobs.length !== 1 ? 's' : ''}</span>
            )}
            {stalledJobs.length > 0 && (
              <span className="text-yellow-600 font-medium">
                {stalledJobs.length} stalled job{stalledJobs.length !== 1 ? 's' : ''} ⚠️
              </span>
            )}
            {completedJobsWithoutFiles.length > 0 && (
              <span className="text-blue-600 font-medium">
                {completedJobsWithoutFiles.length} ready for file generation
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {completedJobsWithoutFiles.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRetroactiveGenerator(true)}
              className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100"
            >
              <FileText className="h-4 w-4 mr-2" />
              Generate Files ({completedJobsWithoutFiles.length})
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

      {/* File Generation Alert */}
      {completedJobsWithoutFiles.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900">
                {completedJobsWithoutFiles.length} completed jobs ready for instant download setup
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                Generate pre-generated files to enable lightning-fast downloads for your completed batch jobs.
                This will create CSV and Excel files stored in the cloud for instant access.
              </p>
              <div className="mt-3 flex items-center gap-4 text-xs text-blue-600">
                <span>• Instant downloads (2-3 seconds vs 30+ seconds)</span>
                <span>• Cached results ready anytime</span>
                <span>• No processing delays</span>
              </div>
              <div className="mt-3">
                <Button
                  size="sm"
                  onClick={() => setShowRetroactiveGenerator(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Set Up Instant Downloads
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      <BatchJobList
        jobs={jobs}
        payeeRowDataMap={payeeRowDataMap}
        refreshingJobs={refreshingJobs}
        pollingStates={pollingStates}
        stalledJobActions={stalledJobActions}
        onRefresh={onRefresh}
        onDownload={onDownload}
        onCancel={onCancel}
        onJobDelete={onJobDelete}
      />
    </div>
  );
};

export default BatchJobContainer;
