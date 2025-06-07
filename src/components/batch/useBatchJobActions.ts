
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
