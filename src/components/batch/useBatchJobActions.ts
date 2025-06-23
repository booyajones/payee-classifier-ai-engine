
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

const CHUNK_SIZE = 500; // Process 500 payees at a time
const DOWNLOAD_TIMEOUT = 30000; // 30 seconds per chunk

export const useBatchJobActions = ({
  jobs,
  payeeRowDataMap,
  onJobUpdate,
  onJobComplete
}: UseBatchJobActionsProps) => {
  const [refreshingJobs, setRefreshingJobs] = useState<Set<string>>(new Set());
  const [downloadingJobs, setDownloadingJobs] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Record<string, { current: number; total: number }>>({});
  const [processedJobResults, setProcessedJobResults] = useState<Set<string>>(new Set());
  const [partialResults, setPartialResults] = useState<Record<string, { results: PayeeClassification[]; summary: BatchProcessingResult }>>({});
  const [cancelledDownloads, setCancelledDownloads] = useState<Set<string>>(new Set());
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

  const downloadChunkedResults = async (
    job: BatchJob,
    uniquePayeeNames: string[],
    onProgress: (current: number, total: number) => void
  ) => {
    const chunks = [];
    for (let i = 0; i < uniquePayeeNames.length; i += CHUNK_SIZE) {
      chunks.push(uniquePayeeNames.slice(i, i + CHUNK_SIZE));
    }

    console.log(`[CHUNKED DOWNLOAD] Processing ${chunks.length} chunks for ${uniquePayeeNames.length} payees`);
    
    const allResults = [];
    
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      // Check if download was cancelled
      if (cancelledDownloads.has(job.id)) {
        console.log(`[CHUNKED DOWNLOAD] Download cancelled for job ${job.id}`);
        throw new Error('Download cancelled by user');
      }

      const chunk = chunks[chunkIndex];
      console.log(`[CHUNKED DOWNLOAD] Processing chunk ${chunkIndex + 1}/${chunks.length} with ${chunk.length} payees`);
      
      try {
        // Add timeout to each chunk download
        const chunkPromise = downloadResultsWithRetry(job, chunk);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Chunk ${chunkIndex + 1} timed out after ${DOWNLOAD_TIMEOUT}ms`)), DOWNLOAD_TIMEOUT);
        });

        const chunkResults = await Promise.race([chunkPromise, timeoutPromise]) as any[];
        allResults.push(...chunkResults);
        
        onProgress(allResults.length, uniquePayeeNames.length);
        
        // Small delay between chunks to prevent overwhelming the API
        if (chunkIndex < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`[CHUNKED DOWNLOAD] Chunk ${chunkIndex + 1} failed:`, error);
        
        // For timeout or API errors, save partial results and continue or fail
        if (allResults.length > 0) {
          console.log(`[CHUNKED DOWNLOAD] Saving partial results: ${allResults.length}/${uniquePayeeNames.length}`);
          throw new Error(`Partial download completed: ${allResults.length}/${uniquePayeeNames.length} results downloaded. Chunk ${chunkIndex + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        throw error;
      }
    }

    return allResults;
  };

  const handleDownloadResults = async (job: BatchJob) => {
    console.log(`[DOWNLOAD] === STARTING CHUNKED DOWNLOAD FOR JOB ${job.id} ===`);
    
    // Prevent duplicate processing
    const resultKey = `${job.id}-results`;
    if (processedJobResults.has(resultKey)) {
      console.log(`[DOWNLOAD] Job ${job.id} results already processed, skipping`);
      return;
    }

    // Clear any previous cancellation
    setCancelledDownloads(prev => {
      const newSet = new Set(prev);
      newSet.delete(job.id);
      return newSet;
    });

    setDownloadingJobs(prev => new Set(prev).add(job.id));
    
    try {
      const payeeRowData = payeeRowDataMap[job.id];
      
      if (!payeeRowData) {
        throw new Error(`No payee row data found for job ${job.id}`);
      }

      const { uniquePayeeNames, originalFileData } = payeeRowData;
      
      console.log(`[DOWNLOAD] Job ${job.id} validation:`, {
        uniquePayees: uniquePayeeNames.length,
        originalRows: originalFileData.length,
        jobId: job.id
      });
      
      if (uniquePayeeNames.length === 0) {
        throw new Error(`No unique payee names found for job ${job.id}`);
      }
      
      if (originalFileData.length === 0) {
        throw new Error(`No original file data found for job ${job.id}`);
      }
      
      setDownloadProgress(prev => ({ ...prev, [job.id]: { current: 0, total: uniquePayeeNames.length } }));

      console.log(`[DOWNLOAD] Starting chunked download for ${uniquePayeeNames.length} unique payees...`);
      
      // Download results in chunks with progress tracking
      const rawResults = await downloadChunkedResults(
        job,
        uniquePayeeNames,
        (current, total) => {
          setDownloadProgress(prev => ({ ...prev, [job.id]: { current, total } }));
        }
      );
      
      console.log(`[DOWNLOAD] Downloaded ${rawResults.length} raw results for job ${job.id}`);
      
      if (rawResults.length !== uniquePayeeNames.length) {
        console.warn(`[DOWNLOAD] Partial results: expected ${uniquePayeeNames.length}, got ${rawResults.length}`);
      }

      // Create classifications for unique payees
      const uniquePayeeClassifications: PayeeClassification[] = [];
      
      console.log(`[DOWNLOAD] Creating classifications for ${rawResults.length} unique payees...`);
      
      for (let i = 0; i < rawResults.length; i++) {
        const payeeName = uniquePayeeNames[i];
        const rawResult = rawResults[i];
        
        const keywordExclusion = checkKeywordExclusion(payeeName);
        
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
      }

      console.log(`[DOWNLOAD] Created ${uniquePayeeClassifications.length} unique payee classifications`);

      // Map results to original rows
      console.log(`[DOWNLOAD] Mapping ${uniquePayeeClassifications.length} unique results to ${originalFileData.length} original rows...`);
      
      const mappedResults = mapResultsToOriginalRows(uniquePayeeClassifications, payeeRowData);
      
      console.log(`[DOWNLOAD] Mapped results count: ${mappedResults.length}`);
      
      if (mappedResults.length !== originalFileData.length) {
        console.error(`[DOWNLOAD] MAPPING ERROR:`, {
          mappedResultsLength: mappedResults.length,
          originalFileDataLength: originalFileData.length,
          uniquePayeesLength: uniquePayeeNames.length
        });
        throw new Error(`Expected exactly ${originalFileData.length} results, got ${mappedResults.length}`);
      }
      
      // Create final classifications
      const finalClassifications: PayeeClassification[] = mappedResults.map((mappedRow, index) => {
        return {
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
      });

      const successCount = finalClassifications.filter(c => c.result.processingTier !== 'Failed').length;
      const failureCount = finalClassifications.length - successCount;

      const summary: BatchProcessingResult = {
        results: finalClassifications,
        successCount,
        failureCount,
        originalFileData: mappedResults
      };

      console.log(`[DOWNLOAD] === DOWNLOAD SUCCESS FOR JOB ${job.id} ===`, {
        originalRows: originalFileData.length,
        finalResults: finalClassifications.length,
        successCount,
        failureCount
      });

      // Mark as processed and store results
      setProcessedJobResults(prev => new Set(prev).add(resultKey));
      
      onJobComplete(finalClassifications, summary, job.id);

      toast({
        title: "Download Complete",
        description: `Successfully processed ${finalClassifications.length} rows.`,
      });
      
    } catch (error) {
      const appError = handleError(error, 'Results Download');
      console.error(`[DOWNLOAD] Download error for job ${job.id}:`, error);
      
      // Check if this was a partial download error
      if (error instanceof Error && error.message.includes('Partial download completed')) {
        toast({
          title: "Partial Download Complete",
          description: error.message + " You can export the partial results.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Download Failed",
          description: `Download failed: ${appError.message}. Try using chunked export for large files.`,
          variant: "destructive",
        });
      }
      
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

  const handleCancelDownload = (jobId: string) => {
    console.log(`[DOWNLOAD] Cancelling download for job ${jobId}`);
    setCancelledDownloads(prev => new Set(prev).add(jobId));
    
    toast({
      title: "Download Cancelled",
      description: "Download has been cancelled.",
    });
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
    partialResults,
    handleRefreshJob,
    handleDownloadResults,
    handleCancelDownload,
    handleCancelJob
  };
};
