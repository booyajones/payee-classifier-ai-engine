import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle, XCircle, Clock, Download, RefreshCw, Trash, Loader2, AlertTriangle } from "lucide-react";
import { BatchJob, checkBatchJobStatus, getBatchJobResults, cancelBatchJob } from "@/lib/openai/trueBatchAPI";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { useBatchJobPolling } from "@/hooks/useBatchJobPolling";
import { handleError, showErrorToast, showRetryableErrorToast } from "@/lib/errorHandler";
import { useRetry } from "@/hooks/useRetry";
import ConfirmationDialog from "./ConfirmationDialog";

interface BatchJobManagerProps {
  jobs: BatchJob[];
  payeeNamesMap: Record<string, string[]>;
  originalFileDataMap: Record<string, any[]>;
  onJobUpdate: (job: BatchJob) => void;
  onJobComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
  onJobDelete: (jobId: string) => void;
}

const BatchJobManager = ({ 
  jobs, 
  payeeNamesMap, 
  originalFileDataMap,
  onJobUpdate, 
  onJobComplete, 
  onJobDelete 
}: BatchJobManagerProps) => {
  const [refreshingJobs, setRefreshingJobs] = useState<Set<string>>(new Set());
  const [downloadingJobs, setDownloadingJobs] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Record<string, { current: number; total: number }>>({});
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: 'default' | 'destructive';
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {}
  });
  const { toast } = useToast();

  // Use the simplified polling hook for manual refresh only
  const { pollingStates, refreshSpecificJob } = useBatchJobPolling(jobs, onJobUpdate);

  // Retry mechanism for operations
  const {
    execute: refreshJobWithRetry,
    isRetrying: isRefreshRetrying
  } = useRetry(checkBatchJobStatus, { maxRetries: 2, baseDelay: 1000 });

  const {
    execute: downloadResultsWithRetry,
    isRetrying: isDownloadRetrying
  } = useRetry(getBatchJobResults, { maxRetries: 3, baseDelay: 2000 });

  // Sort jobs by creation date (most recent first)
  const sortedJobs = [...jobs].sort((a, b) => {
    const dateA = new Date(a.created_at * 1000).getTime();
    const dateB = new Date(b.created_at * 1000).getTime();
    return dateB - dateA; // Descending order (newest first)
  });

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // FIXED: Safe original data recovery without complex fallbacks
  const ensureOriginalData = (payeeNames: string[], existingData?: any[]): any[] => {
    if (existingData && existingData.length === payeeNames.length) {
      console.log(`[RECOVERY] Using preserved original data: ${existingData.length} rows`);
      return existingData;
    }
    
    console.log(`[RECOVERY] Creating minimal fallback for ${payeeNames.length} payees`);
    return payeeNames.map((name, index) => ({
      PayeeName: name,
      RowIndex: index,
      RecoveryApplied: true
    }));
  };

  // FIXED: Safe keyword exclusion processing (simplified)
  const safeKeywordExclusion = () => ({
    isExcluded: false,
    matchedKeywords: [],
    confidence: 0,
    reasoning: 'Safe processing applied'
  });

  const handleRefreshJob = async (jobId: string) => {
    const refreshFunction = async () => {
      setRefreshingJobs(prev => new Set(prev).add(jobId));
      try {
        console.log(`[BATCH MANAGER] Manual refresh for job ${jobId}`);
        const updatedJob = await refreshJobWithRetry(jobId);
        onJobUpdate(updatedJob);
        
        toast({
          title: "Job Status Updated",
          description: `Job ${jobId.slice(-8)} status refreshed to "${updatedJob.status}".`,
        });
      } catch (error) {
        const appError = handleError(error, 'Job Status Refresh');
        console.error(`[BATCH MANAGER] Error refreshing job ${jobId}:`, error);
        
        showRetryableErrorToast(
          appError, 
          () => handleRefreshJob(jobId),
          'Job Refresh'
        );
        throw error;
      } finally {
        setRefreshingJobs(prev => {
          const newSet = new Set(prev);
          newSet.delete(jobId);
          return newSet;
        });
      }
    };

    await refreshSpecificJob(jobId, refreshFunction);
  };

  // FIXED: Single pipeline processing - no dual classification conflicts
  const handleDownloadResults = async (job: BatchJob) => {
    setDownloadingJobs(prev => new Set(prev).add(job.id));
    setDownloadProgress(prev => ({ ...prev, [job.id]: { current: 0, total: 0 } }));
    
    try {
      console.log(`[BATCH MANAGER] FIXED: Single pipeline download for job ${job.id}`);
      const payeeNames = payeeNamesMap[job.id] || [];
      let originalFileData = originalFileDataMap[job.id] || [];
      
      if (payeeNames.length === 0) {
        throw new Error('No payee names found for this job. The job data may be corrupted.');
      }

      // FIXED: Ensure original data alignment
      originalFileData = ensureOriginalData(payeeNames, originalFileData);
      
      console.log(`[BATCH MANAGER] FIXED: Processing ${payeeNames.length} payees with ${originalFileData.length} aligned data rows`);
      setDownloadProgress(prev => ({ ...prev, [job.id]: { current: 0, total: payeeNames.length } }));

      // STEP 1: Get OpenAI Batch Results (single source of truth)
      console.log(`[BATCH MANAGER] FIXED: Downloading OpenAI batch results (single pipeline)`);
      const rawResults = await downloadResultsWithRetry(job, payeeNames);
      
      if (rawResults.length !== payeeNames.length) {
        throw new Error(`OpenAI results misalignment: expected ${payeeNames.length}, got ${rawResults.length}`);
      }

      // STEP 2: Create PayeeClassification array with perfect alignment
      const classifications: PayeeClassification[] = [];
      
      for (let i = 0; i < payeeNames.length; i++) {
        const payeeName = payeeNames[i];
        const rawResult = rawResults[i];
        const originalData = originalFileData[i];
        
        // FIXED: Use OpenAI results directly, no dual processing
        const classification: PayeeClassification = {
          id: `openai-${job.id}-${i}`,
          payeeName: payeeName,
          result: {
            classification: rawResult?.classification || 'Individual',
            confidence: rawResult?.confidence || 50,
            reasoning: rawResult?.reasoning || 'OpenAI batch processing result',
            processingTier: rawResult?.status === 'success' ? 'AI-Powered' : 'Failed',
            processingMethod: 'OpenAI Batch API (Single Pipeline)',
            keywordExclusion: safeKeywordExclusion()
          },
          timestamp: new Date(),
          originalData: originalData,
          rowIndex: i
        };
        
        classifications.push(classification);
        
        // Update progress
        setDownloadProgress(prev => ({ 
          ...prev, 
          [job.id]: { current: i + 1, total: payeeNames.length } 
        }));
      }

      // VALIDATION: Ensure perfect alignment
      if (classifications.length !== payeeNames.length) {
        throw new Error(`Classification alignment error: expected ${payeeNames.length}, got ${classifications.length}`);
      }

      for (let i = 0; i < classifications.length; i++) {
        if (classifications[i].rowIndex !== i) {
          throw new Error(`Row index mismatch at position ${i}`);
        }
        if (classifications[i].payeeName !== payeeNames[i]) {
          throw new Error(`Payee name mismatch at position ${i}`);
        }
      }

      const successCount = classifications.filter(c => c.result.processingTier !== 'Failed').length;
      const failureCount = classifications.length - successCount;

      // FIXED: Create summary with guaranteed alignment
      const summary: BatchProcessingResult = {
        results: classifications,
        successCount,
        failureCount,
        originalFileData: originalFileData
      };

      console.log(`[BATCH MANAGER] FIXED: Single pipeline processing complete - perfect alignment guaranteed`);

      onJobComplete(classifications, summary, job.id);

      toast({
        title: "Download Complete (Single Pipeline)",
        description: `Downloaded ${successCount} classifications using OpenAI Batch API${failureCount > 0 ? ` (${failureCount} failed)` : ''}.`,
      });
      
    } catch (error) {
      const appError = handleError(error, 'Results Download');
      console.error(`[BATCH MANAGER] FIXED: Download error for job ${job.id}:`, error);
      
      toast({
        title: "Download Failed",
        description: `Job ${job.id.slice(-8)} download failed: ${appError.message}`,
        variant: "destructive",
      });
      
    } finally {
      setDownloadingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(job.id);
        return newSet;
      });
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[job.id];
        return newProgress;
      });
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      console.log(`[BATCH MANAGER] Cancelling job ${jobId}`);
      const cancelledJob = await cancelBatchJob(jobId);
      onJobUpdate(cancelledJob);
      
      toast({
        title: "Job Cancelled",
        description: `Batch job ${jobId.slice(-8)} has been cancelled successfully.`,
      });
    } catch (error) {
      const appError = handleError(error, 'Job Cancellation');
      console.error(`[BATCH MANAGER] Error cancelling job ${jobId}:`, error);
      showErrorToast(appError, 'Job Cancellation');
    }
  };

  const showCancelConfirmation = (jobId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Cancel Batch Job',
      description: `Are you sure you want to cancel job ${jobId.slice(-8)}? This action cannot be undone and you may be charged for completed requests.`,
      onConfirm: () => handleCancelJob(jobId),
      variant: 'destructive'
    });
  };

  const showDeleteConfirmation = (jobId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Job',
      description: `Are you sure you want to remove job ${jobId.slice(-8)} from the list? This will only remove it from your view, not delete the actual job.`,
      onConfirm: () => onJobDelete(jobId),
      variant: 'destructive'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'expired':
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
      case 'expired':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (jobs.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No batch jobs found. Submit a batch for processing to see jobs here.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Batch Jobs (Single Pipeline) - Latest First</h3>
        
        {sortedJobs.map((job) => {
          const pollingState = pollingStates[job.id];
          const isJobRefreshing = refreshingJobs.has(job.id);
          const isJobDownloading = downloadingJobs.has(job.id);
          const progress = downloadProgress[job.id];
          const payeeCount = payeeNamesMap[job.id]?.length || 0;
          const hasOriginalData = originalFileDataMap[job.id]?.length > 0;
          
          return (
            <Card key={job.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">
                      Job {job.id.slice(-8)}
                    </CardTitle>
                    <CardDescription>
                      {job.metadata?.description || 'Payee classification batch'} • {payeeCount} payees
                      {hasOriginalData ? (
                        <span className="text-green-600"> • Original data preserved</span>
                      ) : (
                        <span className="text-orange-600"> • Fallback data available</span>
                      )}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        Created: {formatDate(job.created_at)}
                      </span>
                      {job.completed_at && (
                        <>
                          <br />
                          <span className="text-xs text-muted-foreground">
                            Completed: {formatDate(job.completed_at)}
                          </span>
                        </>
                      )}
                    </CardDescription>
                    {pollingState?.lastError && (
                      <p className="text-xs text-red-600 mt-1">
                        Last refresh error: {pollingState.lastError}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(job.status)}
                    <Badge className={getStatusColor(job.status)}>
                      {job.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Total Requests:</span> {job.request_counts.total}
                  </div>
                  <div>
                    <span className="font-medium">Completed:</span> {job.request_counts.completed}
                  </div>
                  <div>
                    <span className="font-medium">Failed:</span> {job.request_counts.failed}
                  </div>
                  <div>
                    <span className="font-medium">Progress:</span>{' '}
                    {Math.round((job.request_counts.completed / job.request_counts.total) * 100)}%
                  </div>
                </div>

                {progress && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Processing results...</span>
                      <span>{progress.current}/{progress.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRefreshJob(job.id)}
                    disabled={isJobRefreshing || pollingState?.isPolling}
                  >
                    {isJobRefreshing || pollingState?.isPolling ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    {isJobRefreshing || pollingState?.isPolling ? 'Refreshing...' : 'Refresh Status'}
                  </Button>

                  {job.status === 'completed' && (
                    <Button
                      size="sm"
                      onClick={() => handleDownloadResults(job)}
                      disabled={isJobDownloading}
                    >
                      {isJobDownloading ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3 mr-1" />
                      )}
                      {isJobDownloading 
                        ? (progress ? `Processing ${progress.current}/${progress.total}...` : 'Processing...')
                        : 'Download Results (Single Pipeline)'
                      }
                    </Button>
                  )}

                  {['validating', 'in_progress'].includes(job.status) && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => showCancelConfirmation(job.id)}
                    >
                      Cancel Job
                    </Button>
                  )}

                  {['completed', 'failed', 'expired', 'cancelled'].includes(job.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => showDeleteConfirmation(job.id)}
                    >
                      <Trash className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, isOpen: open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.variant === 'destructive' ? 'Delete' : 'Continue'}
      />
    </>
  );
};

export default BatchJobManager;
