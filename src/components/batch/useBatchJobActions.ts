
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { BatchJob, checkBatchJobStatus, getBatchJobResults, cancelBatchJob } from "@/lib/openai/trueBatchAPI";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { useBatchJobPolling } from "@/hooks/useBatchJobPolling";
import { handleError, showErrorToast, showRetryableErrorToast } from "@/lib/errorHandler";
import { useRetry } from "@/hooks/useRetry";
import { checkKeywordExclusion } from "@/lib/classification/enhancedKeywordExclusion";

interface UseBatchJobActionsProps {
  jobs: BatchJob[];
  payeeNamesMap: Record<string, string[]>;
  originalFileDataMap: Record<string, any[]>;
  onJobUpdate: (job: BatchJob) => void;
  onJobComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
}

export const useBatchJobActions = ({
  jobs,
  payeeNamesMap,
  originalFileDataMap,
  onJobUpdate,
  onJobComplete
}: UseBatchJobActionsProps) => {
  const [refreshingJobs, setRefreshingJobs] = useState<Set<string>>(new Set());
  const [downloadingJobs, setDownloadingJobs] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Record<string, { current: number; total: number }>>({});
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

  // FIXED: Ensure EXACT data alignment with strict validation
  const ensureDataAlignment = (payeeNames: string[], originalData: any[]): any[] => {
    console.log(`[ALIGNMENT] Input: ${payeeNames.length} payee names, ${originalData.length} original rows`);
    
    if (!originalData || originalData.length === 0) {
      console.log(`[ALIGNMENT] No original data, creating indexed fallback`);
      return payeeNames.map((name, index) => ({
        PayeeName: name,
        RowIndex: index
      }));
    }
    
    if (originalData.length === payeeNames.length) {
      console.log(`[ALIGNMENT] Perfect alignment exists`);
      return originalData;
    }
    
    // STRICT: Must match exactly - no tolerance for misalignment
    throw new Error(`CRITICAL ALIGNMENT ERROR: ${payeeNames.length} payee names vs ${originalData.length} original data rows. Cannot proceed with misaligned data.`);
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
        console.error(`[BATCH ACTIONS] Error refreshing job ${jobId}:`, error);
        
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
      
      console.log(`[DOWNLOAD] Job ${job.id}: ${payeeNames.length} payees, ${rawOriginalFileData.length} original rows`);
      
      // STRICT VALIDATION: Must have exact data alignment
      if (payeeNames.length === 0) {
        throw new Error('No payee names found for this job');
      }
      
      const originalFileData = ensureDataAlignment(payeeNames, rawOriginalFileData);
      
      setDownloadProgress(prev => ({ ...prev, [job.id]: { current: 0, total: payeeNames.length } }));

      const rawResults = await downloadResultsWithRetry(job, payeeNames);
      
      if (rawResults.length !== payeeNames.length) {
        throw new Error(`Results misalignment: expected ${payeeNames.length}, got ${rawResults.length}`);
      }

      // GUARANTEED 1:1 processing - no loops that could create duplicates
      const classifications: PayeeClassification[] = new Array(payeeNames.length);
      
      for (let i = 0; i < payeeNames.length; i++) {
        const payeeName = payeeNames[i];
        const rawResult = rawResults[i];
        const originalData = originalFileData[i];
        
        // Apply keyword exclusion
        const keywordExclusion = checkKeywordExclusion(payeeName);
        
        // Create classification with UNIQUE ID that includes job and index
        classifications[i] = {
          id: `job-${job.id}-row-${i}`, // GUARANTEED unique per job per row
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
          originalData: originalData,
          rowIndex: i
        };
        
        setDownloadProgress(prev => ({ 
          ...prev, 
          [job.id]: { current: i + 1, total: payeeNames.length } 
        }));
      }

      // FINAL VALIDATION: Ensure exact count match
      if (classifications.length !== payeeNames.length) {
        throw new Error(`FINAL COUNT ERROR: created ${classifications.length} classifications from ${payeeNames.length} payees`);
      }

      const successCount = classifications.filter(c => c.result.processingTier !== 'Failed').length;
      const failureCount = classifications.length - successCount;

      const summary: BatchProcessingResult = {
        results: classifications,
        successCount,
        failureCount,
        originalFileData: originalFileData
      };

      console.log(`[DOWNLOAD] PERFECT PROCESSING COMPLETE:`, {
        jobId: job.id,
        inputCount: payeeNames.length,
        outputCount: classifications.length,
        successCount,
        failureCount
      });

      onJobComplete(classifications, summary, job.id);

      toast({
        title: "Download Complete",
        description: `Processed exactly ${classifications.length} rows (${successCount} successful, ${failureCount} failed).`,
      });
      
    } catch (error) {
      const appError = handleError(error, 'Results Download');
      console.error(`[DOWNLOAD] Error for job ${job.id}:`, error);
      
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
      console.error(`[BATCH ACTIONS] Error cancelling job ${jobId}:`, error);
      showErrorToast(appError, 'Job Cancellation');
    }
  };

  return {
    refreshingJobs,
    downloadingJobs,
    downloadProgress,
    pollingStates,
    handleRefreshJob,
    handleDownloadResults,
    handleCancelJob
  };
};
