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
import { checkKeywordExclusion } from "@/lib/classification/enhancedKeywordExclusion";
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

  const { pollingStates, refreshSpecificJob } = useBatchJobPolling(jobs, onJobUpdate);

  const {
    execute: refreshJobWithRetry,
    isRetrying: isRefreshRetrying
  } = useRetry(checkBatchJobStatus, { maxRetries: 2, baseDelay: 1000 });

  const {
    execute: downloadResultsWithRetry,
    isRetrying: isDownloadRetrying
  } = useRetry(getBatchJobResults, { maxRetries: 3, baseDelay: 2000 });

  const sortedJobs = [...jobs].sort((a, b) => {
    const dateA = new Date(a.created_at * 1000).getTime();
    const dateB = new Date(b.created_at * 1000).getTime();
    return dateB - dateA;
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

  // FIXED: Ensure perfect alignment by trimming original data to match payee names count
  const ensureDataAlignment = (payeeNames: string[], originalData: any[]): any[] => {
    console.log(`[ALIGNMENT FIX] Input: ${payeeNames.length} payee names, ${originalData.length} original rows`);
    
    if (!originalData || originalData.length === 0) {
      console.log(`[ALIGNMENT FIX] No original data, creating fallback data`);
      return payeeNames.map((name, index) => ({
        PayeeName: name,
        RowIndex: index
      }));
    }
    
    if (originalData.length === payeeNames.length) {
      console.log(`[ALIGNMENT FIX] Perfect alignment already exists`);
      return originalData;
    }
    
    if (originalData.length > payeeNames.length) {
      console.log(`[ALIGNMENT FIX] Trimming ${originalData.length} original rows to ${payeeNames.length}`);
      // Take only the first N rows to match payee names count
      const trimmedData = originalData.slice(0, payeeNames.length);
      console.log(`[ALIGNMENT FIX] After trimming: ${trimmedData.length} rows`);
      return trimmedData;
    }
    
    if (originalData.length < payeeNames.length) {
      console.log(`[ALIGNMENT FIX] Padding ${originalData.length} original rows to ${payeeNames.length}`);
      // Pad with fallback data for missing rows
      const paddedData = [...originalData];
      for (let i = originalData.length; i < payeeNames.length; i++) {
        paddedData.push({
          PayeeName: payeeNames[i],
          RowIndex: i
        });
      }
      console.log(`[ALIGNMENT FIX] After padding: ${paddedData.length} rows`);
      return paddedData;
    }
    
    return originalData;
  };

  const handleRefreshJob = async (jobId: string) => {
    const refreshFunction = async () => {
      setRefreshingJobs(prev => new Set(prev).add(jobId));
      try {
        const updatedJob = await refreshJobWithRetry(jobId);
        onJobUpdate(updatedJob);
        
        toast({
          title: "Job Status Updated",
          description: `Job status refreshed to "${updatedJob.status}".`,
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

  const handleDownloadResults = async (job: BatchJob) => {
    setDownloadingJobs(prev => new Set(prev).add(job.id));
    setDownloadProgress(prev => ({ ...prev, [job.id]: { current: 0, total: 0 } }));
    
    try {
      const payeeNames = payeeNamesMap[job.id] || [];
      const rawOriginalFileData = originalFileDataMap[job.id] || [];
      
      console.log(`[BATCH MANAGER] BEFORE ALIGNMENT FIX:`, {
        jobId: job.id,
        payeeCount: payeeNames.length,
        originalDataCount: rawOriginalFileData.length
      });
      
      // CRITICAL FIX: Ensure perfect data alignment
      const originalFileData = ensureDataAlignment(payeeNames, rawOriginalFileData);
      
      console.log(`[BATCH MANAGER] AFTER ALIGNMENT FIX:`, {
        jobId: job.id,
        payeeCount: payeeNames.length,
        originalDataCount: originalFileData.length,
        perfectAlignment: payeeNames.length === originalFileData.length
      });
      
      // STRICT VALIDATION: Must have exact data alignment
      if (payeeNames.length === 0) {
        throw new Error('No payee names found for this job');
      }
      
      if (originalFileData.length !== payeeNames.length) {
        throw new Error(`CRITICAL: Data alignment failed - ${payeeNames.length} payee names vs ${originalFileData.length} original data rows`);
      }
      
      setDownloadProgress(prev => ({ ...prev, [job.id]: { current: 0, total: payeeNames.length } }));

      const rawResults = await downloadResultsWithRetry(job, payeeNames);
      
      if (rawResults.length !== payeeNames.length) {
        throw new Error(`Results misalignment: expected ${payeeNames.length}, got ${rawResults.length}`);
      }

      const classifications: PayeeClassification[] = [];
      
      for (let i = 0; i < payeeNames.length; i++) {
        const payeeName = payeeNames[i];
        const rawResult = rawResults[i];
        const originalData = originalFileData[i]; // Perfect 1:1 mapping guaranteed
        
        // Apply keyword exclusion
        const keywordExclusion = checkKeywordExclusion(payeeName);
        
        const classification: PayeeClassification = {
          id: `openai-${job.id}-${i}`,
          payeeName: payeeName,
          result: {
            classification: rawResult?.classification || 'Individual',
            confidence: rawResult?.confidence || 50,
            reasoning: rawResult?.reasoning || 'OpenAI batch processing result',
            processingTier: rawResult?.status === 'success' ? 'AI-Powered' : 'Failed',
            processingMethod: 'OpenAI Batch API',
            keywordExclusion: keywordExclusion
          },
          timestamp: new Date(),
          originalData: originalData, // Perfect 1:1 mapping
          rowIndex: i
        };
        
        classifications.push(classification);
        
        setDownloadProgress(prev => ({ 
          ...prev, 
          [job.id]: { current: i + 1, total: payeeNames.length } 
        }));
      }

      // FINAL VALIDATION
      if (classifications.length !== payeeNames.length) {
        throw new Error(`Final count mismatch: created ${classifications.length} classifications from ${payeeNames.length} payees`);
      }

      const successCount = classifications.filter(c => c.result.processingTier !== 'Failed').length;
      const failureCount = classifications.length - successCount;

      const summary: BatchProcessingResult = {
        results: classifications,
        successCount,
        failureCount,
        originalFileData: originalFileData // Aligned data
      };

      console.log(`[BATCH MANAGER] PERFECT ALIGNMENT ACHIEVED:`, {
        jobId: job.id,
        payeeNames: payeeNames.length,
        classifications: classifications.length,
        originalFileData: originalFileData.length,
        allMatch: payeeNames.length === classifications.length && classifications.length === originalFileData.length
      });

      onJobComplete(classifications, summary, job.id);

      toast({
        title: "Download Complete",
        description: `Processed exactly ${classifications.length} rows (${successCount} successful, ${failureCount} failed).`,
      });
      
    } catch (error) {
      const appError = handleError(error, 'Results Download');
      console.error(`[BATCH MANAGER] Download error for job ${job.id}:`, error);
      
      toast({
        title: "Download Failed",
        description: `Job download failed: ${appError.message}`,
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
      const cancelledJob = await cancelBatchJob(jobId);
      onJobUpdate(cancelledJob);
      
      toast({
        title: "Job Cancelled",
        description: `Batch job has been cancelled successfully.`,
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
      description: `Are you sure you want to cancel this job? This action cannot be undone and you may be charged for completed requests.`,
      onConfirm: () => handleCancelJob(jobId),
      variant: 'destructive'
    });
  };

  const showDeleteConfirmation = (jobId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Job',
      description: `Are you sure you want to remove this job from the list? This will only remove it from your view, not delete the actual job.`,
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
        <h3 className="text-lg font-medium">Batch Jobs</h3>
        
        {sortedJobs.map((job) => {
          const pollingState = pollingStates[job.id];
          const isJobRefreshing = refreshingJobs.has(job.id);
          const isJobDownloading = downloadingJobs.has(job.id);
          const progress = downloadProgress[job.id];
          const payeeCount = payeeNamesMap[job.id]?.length || 0;
          
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
                        : 'Download Results'
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
