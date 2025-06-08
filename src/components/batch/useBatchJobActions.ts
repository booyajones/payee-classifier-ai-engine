
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
        console.log(`[DEBUG] Refreshing job ${jobId}`);
        const updatedJob = await refreshJobWithRetry(jobId);
        console.log(`[DEBUG] Job ${jobId} updated status:`, updatedJob.status);
        onJobUpdate(updatedJob);
        
        toast({
          title: "Job Status Updated",
          description: `Job status refreshed to "${updatedJob.status}".`,
        });
      } catch (error) {
        const appError = handleError(error, 'Job Status Refresh');
        console.error(`[DEBUG] Error refreshing job ${jobId}:`, error);
        
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
    console.log(`[DEBUG] === STARTING DOWNLOAD FOR JOB ${job.id} ===`);
    setDownloadingJobs(prev => new Set(prev).add(job.id));
    
    try {
      const payeeRowData = payeeRowDataMap[job.id];
      
      if (!payeeRowData) {
        throw new Error(`No payee row data found for job ${job.id}`);
      }

      const { uniquePayeeNames, originalFileData } = payeeRowData;
      
      console.log(`[DEBUG] Download validation for job ${job.id}:`, {
        uniquePayees: uniquePayeeNames.length,
        originalRows: originalFileData.length,
        jobId: job.id
      });
      
      // CRITICAL VALIDATION: Ensure we have all required data
      if (uniquePayeeNames.length === 0) {
        throw new Error(`No unique payee names found for job ${job.id}`);
      }
      
      if (originalFileData.length === 0) {
        throw new Error(`No original file data found for job ${job.id}`);
      }
      
      setDownloadProgress(prev => ({ ...prev, [job.id]: { current: 0, total: uniquePayeeNames.length } }));

      console.log(`[DEBUG] Downloading raw results for ${uniquePayeeNames.length} unique payees...`);
      
      // Download raw results for unique payees only
      const rawResults = await downloadResultsWithRetry(job, uniquePayeeNames);
      
      console.log(`[DEBUG] Downloaded ${rawResults.length} raw results for job ${job.id}`);
      
      if (rawResults.length !== uniquePayeeNames.length) {
        throw new Error(`Results misalignment: expected ${uniquePayeeNames.length}, got ${rawResults.length}`);
      }

      // Create classifications for unique payees first
      const uniquePayeeClassifications: PayeeClassification[] = [];
      
      console.log(`[DEBUG] Creating classifications for unique payees...`);
      
      for (let i = 0; i < uniquePayeeNames.length; i++) {
        const payeeName = uniquePayeeNames[i];
        const rawResult = rawResults[i];
        
        console.log(`[DEBUG] Processing unique payee ${i + 1}/${uniquePayeeNames.length}: "${payeeName}"`);
        
        // Apply keyword exclusion
        const keywordExclusion = checkKeywordExclusion(payeeName);
        
        // Create classification for unique payee
        uniquePayeeClassifications.push({
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
          originalData: null,
          rowIndex: i
        });
        
        setDownloadProgress(prev => ({ 
          ...prev, 
          [job.id]: { current: i + 1, total: uniquePayeeNames.length } 
        }));
      }

      console.log(`[DEBUG] Created ${uniquePayeeClassifications.length} unique payee classifications`);

      // CRITICAL: Use row mapping to expand unique results to ALL original rows
      console.log(`[DEBUG] Mapping ${uniquePayeeClassifications.length} unique results to ${originalFileData.length} original rows...`);
      
      const mappedResults = mapResultsToOriginalRows(uniquePayeeClassifications, payeeRowData);
      
      console.log(`[DEBUG] Mapped results count: ${mappedResults.length}`);
      console.log(`[DEBUG] Expected original rows: ${originalFileData.length}`);
      
      // VALIDATION: Must match original file length exactly
      if (mappedResults.length !== originalFileData.length) {
        console.error(`[DEBUG] CRITICAL MAPPING ERROR:`, {
          mappedResultsLength: mappedResults.length,
          originalFileDataLength: originalFileData.length,
          uniquePayeesLength: uniquePayeeNames.length
        });
        throw new Error(`CRITICAL: Expected exactly ${originalFileData.length} results, got ${mappedResults.length}`);
      }
      
      // Create final classifications from mapped results
      console.log(`[DEBUG] Creating final classifications from mapped results...`);
      
      const finalClassifications: PayeeClassification[] = mappedResults.map((mappedRow, index) => {
        const classification: PayeeClassification = {
          id: `job-${job.id}-row-${index}`,
          payeeName: mappedRow.PayeeName || mappedRow.payeeName || 'Unknown',
          result: {
            classification: mappedRow.classification || 'Individual',
            confidence: parseInt(mappedRow.confidence) || 50,
            reasoning: mappedRow.reasoning || 'Mapped from unique payee classification',
            processingTier: mappedRow.processingTier || 'AI-Powered',
            processingMethod: mappedRow.processingMethod || 'OpenAI Batch API',
            keywordExclusion: {
              isExcluded: mappedRow.keywordExclusion === 'Yes',
              matchedKeywords: mappedRow.matchedKeywords ? mappedRow.matchedKeywords.split('; ').filter(k => k) : [],
              confidence: parseInt(mappedRow.keywordConfidence) || 0,
              reasoning: mappedRow.keywordReasoning || 'No keyword exclusion applied'
            }
          },
          timestamp: new Date(mappedRow.timestamp || Date.now()),
          originalData: mappedRow,
          rowIndex: index
        };
        
        // Validate each classification
        if (!classification.payeeName) {
          console.warn(`[DEBUG] Warning: Empty payee name at row ${index}`);
        }
        
        return classification;
      });

      console.log(`[DEBUG] Created ${finalClassifications.length} final classifications`);

      // FINAL VALIDATION: Must match original file length exactly
      if (finalClassifications.length !== originalFileData.length) {
        console.error(`[DEBUG] FINAL VALIDATION FAILED:`, {
          finalClassificationsLength: finalClassifications.length,
          originalFileDataLength: originalFileData.length
        });
        throw new Error(`CRITICAL: Expected exactly ${originalFileData.length} results, got ${finalClassifications.length}`);
      }

      // Validate no duplicate IDs
      const ids = finalClassifications.map(c => c.id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        console.warn(`[DEBUG] Warning: Found ${ids.length - uniqueIds.size} duplicate IDs in final classifications`);
      }

      const successCount = finalClassifications.filter(c => c.result.processingTier !== 'Failed').length;
      const failureCount = finalClassifications.length - successCount;

      const summary: BatchProcessingResult = {
        results: finalClassifications,
        successCount,
        failureCount,
        originalFileData: mappedResults
      };

      console.log(`[DEBUG] === DOWNLOAD SUCCESS FOR JOB ${job.id} ===`, {
        originalRows: originalFileData.length,
        finalResults: finalClassifications.length,
        successCount,
        failureCount,
        perfectAlignment: finalClassifications.length === originalFileData.length
      });

      onJobComplete(finalClassifications, summary, job.id);

      toast({
        title: "Download Complete",
        description: `Processed exactly ${finalClassifications.length} rows with perfect alignment.`,
      });
      
    } catch (error) {
      const appError = handleError(error, 'Results Download');
      console.error(`[DEBUG] Download error for job ${job.id}:`, error);
      
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
      console.log(`[DEBUG] Cancelling job ${jobId}`);
      const cancelledJob = await cancelBatchJob(jobId);
      console.log(`[DEBUG] Job ${jobId} cancelled successfully, new status:`, cancelledJob.status);
      onJobUpdate(cancelledJob);
      
      toast({
        title: "Job Cancelled",
        description: `Batch job has been cancelled successfully.`,
      });
    } catch (error) {
      const appError = handleError(error, 'Job Cancellation');
      console.error(`[DEBUG] Error cancelling job ${jobId}:`, error);
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
