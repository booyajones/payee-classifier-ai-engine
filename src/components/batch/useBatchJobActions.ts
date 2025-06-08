import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { BatchJob, checkBatchJobStatus, getBatchJobResults, cancelBatchJob } from "@/lib/openai/trueBatchAPI";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { PayeeRowData, mapResultsToOriginalRows } from "@/lib/rowMapping";
import { useBatchJobPolling } from "@/hooks/useBatchJobPolling";
import { handleError, showErrorToast, showRetryableErrorToast } from "@/lib/errorHandler";
import { useRetry } from "@/hooks/useRetry";
import { checkKeywordExclusion } from "@/lib/classification/enhancedKeywordExclusion";

interface UseBatchJobActionsProps {
  jobs: BatchJob[];
  payeeRowDataMap: Record<string, PayeeRowData>;
  onJobUpdate: (job: BatchJob) => void;
  onJobComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
}

export const useBatchJobActions = ({
  jobs,
  payeeRowDataMap,
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
    
    try {
      const payeeRowData = payeeRowDataMap[job.id];
      
      if (!payeeRowData) {
        throw new Error(`No payee row data found for job ${job.id}`);
      }

      const { uniquePayeeNames, rowMappings, originalFileData } = payeeRowData;
      
      console.log(`[DOWNLOAD] Job ${job.id}: ${uniquePayeeNames.length} unique payees, ${originalFileData.length} original rows, ${rowMappings.length} mappings`);
      
      setDownloadProgress(prev => ({ ...prev, [job.id]: { current: 0, total: uniquePayeeNames.length } }));

      // Download raw results for unique payees only
      const rawResults = await downloadResultsWithRetry(job, uniquePayeeNames);
      
      if (rawResults.length !== uniquePayeeNames.length) {
        throw new Error(`Results misalignment: expected ${uniquePayeeNames.length}, got ${rawResults.length}`);
      }

      // FIXED: Create classifications for unique payees first, then map to original rows
      const uniquePayeeClassifications: PayeeClassification[] = new Array(uniquePayeeNames.length);
      
      for (let i = 0; i < uniquePayeeNames.length; i++) {
        const payeeName = uniquePayeeNames[i];
        const rawResult = rawResults[i];
        
        // Apply keyword exclusion
        const keywordExclusion = checkKeywordExclusion(payeeName);
        
        // Create classification for unique payee
        uniquePayeeClassifications[i] = {
          id: `job-${job.id}-payee-${i}`,
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
          originalData: null, // Will be set by mapping function
          rowIndex: i
        };
        
        setDownloadProgress(prev => ({ 
          ...prev, 
          [job.id]: { current: i + 1, total: uniquePayeeNames.length } 
        }));
      }

      // FIXED: Use row mapping to create properly aligned results for ALL original rows
      const mappedResults = mapResultsToOriginalRows(uniquePayeeClassifications, payeeRowData);
      
      // Create final classifications for each original row
      const finalClassifications: PayeeClassification[] = mappedResults.map((row, index) => ({
        id: `job-${job.id}-row-${index}`,
        payeeName: row.PayeeName || row.payeeName || 'Unknown',
        result: {
          classification: row.classification || 'Individual',
          confidence: parseInt(row.confidence) || 50,
          reasoning: row.reasoning || 'Mapped from unique payee classification',
          processingTier: row.processingTier || 'AI-Powered',
          processingMethod: row.processingMethod || 'OpenAI Batch API',
          keywordExclusion: {
            isExcluded: row.keywordExclusion === 'Yes',
            matchedKeywords: row.matchedKeywords ? row.matchedKeywords.split('; ').filter(k => k) : [],
            confidence: parseInt(row.keywordConfidence) || 0,
            reasoning: row.keywordReasoning || 'No keyword exclusion applied'
          }
        },
        timestamp: new Date(row.timestamp || Date.now()),
        originalData: row,
        rowIndex: index
      }));

      const successCount = finalClassifications.filter(c => c.result.processingTier !== 'Failed').length;
      const failureCount = finalClassifications.length - successCount;

      const summary: BatchProcessingResult = {
        results: finalClassifications,
        successCount,
        failureCount,
        originalFileData: mappedResults
      };

      console.log(`[DOWNLOAD] PERFECT ALIGNMENT ACHIEVED:`, {
        jobId: job.id,
        originalRows: originalFileData.length,
        finalResults: finalClassifications.length,
        mappedResults: mappedResults.length,
        successCount,
        failureCount,
        isAligned: originalFileData.length === finalClassifications.length && finalClassifications.length === mappedResults.length
      });

      onJobComplete(finalClassifications, summary, job.id);

      toast({
        title: "Download Complete",
        description: `Processed exactly ${finalClassifications.length} rows (${successCount} successful, ${failureCount} failed).`,
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
