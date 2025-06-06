import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle, XCircle, Clock, Download, RefreshCw, Trash, Loader2 } from "lucide-react";
import { BatchJob, checkBatchJobStatus, getBatchJobResults, cancelBatchJob } from "@/lib/openai/trueBatchAPI";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { enhancedClassifyPayeeV3 } from "@/lib/classification/enhancedClassificationV3";
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

  // Use the centralized polling hook
  const { pollingStates } = useBatchJobPolling(jobs, onJobUpdate);

  // Retry mechanism for operations
  const {
    execute: refreshJobWithRetry,
    isRetrying: isRefreshRetrying
  } = useRetry(checkBatchJobStatus, { maxRetries: 2, baseDelay: 1000 });

  const {
    execute: downloadResultsWithRetry,
    isRetrying: isDownloadRetrying
  } = useRetry(getBatchJobResults, { maxRetries: 3, baseDelay: 2000 });

  const handleRefreshJob = async (jobId: string) => {
    setRefreshingJobs(prev => new Set(prev).add(jobId));
    try {
      console.log(`[BATCH MANAGER] Refreshing job ${jobId}`);
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
    } finally {
      setRefreshingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  };

  const handleDownloadResults = async (job: BatchJob) => {
    setDownloadingJobs(prev => new Set(prev).add(job.id));
    
    try {
      console.log(`[BATCH MANAGER] Downloading results for job ${job.id} with enhanced processing`);
      const payeeNames = payeeNamesMap[job.id] || [];
      const originalFileData = originalFileDataMap[job.id] || [];
      
      if (payeeNames.length === 0) {
        throw new Error('No payee names found for this job. The job data may be corrupted.');
      }

      // Get raw OpenAI results
      const rawResults = await downloadResultsWithRetry(job, payeeNames);
      
      // Enhance each result with keyword exclusion and full classification details
      const classifications: PayeeClassification[] = [];
      
      for (let index = 0; index < payeeNames.length; index++) {
        const name = payeeNames[index];
        const rawResult = rawResults[index];
        const originalData = originalFileData[index] || {};
        
        try {
          // Use enhanced classification to get keyword exclusion and complete data
          const enhancedResult = await enhancedClassifyPayeeV3(name, {
            aiThreshold: 80,
            bypassRuleNLP: true,
            useEnhanced: true,
            offlineMode: false,
            useFuzzyMatching: true,
            similarityThreshold: 85
          });
          
          // Override with OpenAI result if it was successful
          if (rawResult?.status === 'success' && enhancedResult.processingTier !== 'Excluded') {
            enhancedResult.classification = rawResult.classification;
            enhancedResult.confidence = Math.max(rawResult.confidence, enhancedResult.confidence);
            enhancedResult.reasoning = `${rawResult.reasoning} (Enhanced with keyword exclusion analysis)`;
            enhancedResult.processingTier = 'AI-Powered';
          }
          
          const payeeClassification: PayeeClassification = {
            id: `enhanced-${job.id}-${index}`,
            payeeName: name,
            result: enhancedResult,
            timestamp: new Date(),
            originalData,
            rowIndex: index
          };
          
          classifications.push(payeeClassification);
          
        } catch (enhancementError) {
          console.warn(`[BATCH MANAGER] Enhancement failed for "${name}", using fallback:`, enhancementError);
          
          // Fallback to raw result
          const fallbackClassification: PayeeClassification = {
            id: `fallback-${job.id}-${index}`,
            payeeName: name,
            result: {
              classification: rawResult?.classification || 'Individual',
              confidence: rawResult?.confidence || 0,
              reasoning: rawResult?.reasoning || 'Enhancement failed, using basic result',
              processingTier: rawResult?.status === 'success' ? 'AI-Powered' : 'Failed',
              processingMethod: 'Fallback processing'
            },
            timestamp: new Date(),
            originalData,
            rowIndex: index
          };
          
          classifications.push(fallbackClassification);
        }
      }

      const successCount = classifications.filter(c => c.result.processingTier !== 'Failed').length;
      const failureCount = classifications.length - successCount;

      const summary: BatchProcessingResult = {
        results: classifications,
        successCount,
        failureCount,
        originalFileData
      };

      onJobComplete(classifications, summary, job.id);

      toast({
        title: "Enhanced Results Downloaded Successfully",
        description: `Downloaded ${successCount} classifications with keyword exclusion and original data${failureCount > 0 ? ` and ${failureCount} failed attempts` : ''}.`,
      });
    } catch (error) {
      const appError = handleError(error, 'Results Download');
      console.error(`[BATCH MANAGER] Error downloading results for job ${job.id}:`, error);
      
      showRetryableErrorToast(
        appError, 
        () => handleDownloadResults(job),
        'Results Download'
      );
    } finally {
      setDownloadingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(job.id);
        return newSet;
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
        <h3 className="text-lg font-medium">Enhanced Batch Jobs</h3>
        
        {jobs.map((job) => {
          const pollingState = pollingStates[job.id];
          const isJobRefreshing = refreshingJobs.has(job.id);
          const isJobDownloading = downloadingJobs.has(job.id);
          const payeeCount = payeeNamesMap[job.id]?.length || 0;
          const hasOriginalData = originalFileDataMap[job.id]?.length > 0;
          
          return (
            <Card key={job.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">
                      Job {job.id.slice(-8)}
                      {pollingState?.isPolling && (
                        <span className="ml-2 text-xs text-blue-600">
                          (Auto-refreshing #{pollingState.pollCount})
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {job.metadata?.description || 'Payee classification batch'} • {payeeCount} payees
                      {hasOriginalData && <span className="text-green-600"> • Original data preserved</span>}
                    </CardDescription>
                    {pollingState?.lastError && (
                      <p className="text-xs text-red-600 mt-1">
                        Polling error: {pollingState.lastError}
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

                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRefreshJob(job.id)}
                    disabled={isJobRefreshing || pollingState?.isPolling}
                  >
                    {isJobRefreshing ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    {isJobRefreshing ? 'Refreshing...' : 'Refresh'}
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
                      {isJobDownloading ? 'Enhancing...' : 'Download Enhanced Results'}
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
