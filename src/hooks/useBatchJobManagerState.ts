
import { useState, useCallback } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';

export const useBatchJobManagerState = () => {
  const [autoPollingJobs, setAutoPollingJobs] = useState<Set<string>>(new Set());

  const handleJobComplete = useCallback((
    results: PayeeClassification[], 
    summary: BatchProcessingResult, 
    jobId: string,
    isJobProcessed: (id: string) => boolean,
    isJobProcessing: (id: string) => boolean,
    markJobAsProcessing: (id: string) => void,
    markJobAsProcessed: (id: string) => void,
    removeJobFromProcessing: (id: string) => void,
    updateProgress: (id: string, stage: string, percentage: number, message?: string, jobId?: string) => void,
    onJobComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void
  ) => {
    console.log(`[BATCH MANAGER] Job ${jobId} completion handler called with ${results.length} results`);
    
    if (isJobProcessed(jobId)) {
      console.log(`[BATCH MANAGER] Job ${jobId} already processed, ignoring duplicate`);
      return;
    }
    
    if (isJobProcessing(jobId)) {
      console.log(`[BATCH MANAGER] Job ${jobId} processing already in progress, ignoring`);
      return;
    }
    
    markJobAsProcessing(jobId);
    updateProgress(`job-${jobId}`, 'Download complete!', 100, `Successfully processed ${results.length} payees`, jobId);
    
    try {
      if (results.length === 0) {
        console.error(`[BATCH MANAGER] Job ${jobId} completed with 0 results - this is unexpected`);
        return;
      }
      
      // Deduplicate results by ID
      const ids = results.map(r => r.id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        console.warn(`[BATCH MANAGER] Job ${jobId} has ${ids.length - uniqueIds.size} duplicate result IDs`);
        
        const seenIds = new Set<string>();
        const deduplicatedResults = results.filter(result => {
          if (seenIds.has(result.id)) {
            return false;
          }
          seenIds.add(result.id);
          return true;
        });
        
        console.log(`[BATCH MANAGER] Deduplicated ${results.length} results to ${deduplicatedResults.length}`);
        results = deduplicatedResults;
      }
      
      // Check for duplicate row indices
      const rowIndices = results.map(r => r.rowIndex).filter(idx => idx !== undefined);
      const uniqueRowIndices = new Set(rowIndices);
      if (rowIndices.length !== uniqueRowIndices.size) {
        console.error(`[BATCH MANAGER] Job ${jobId} has duplicate row indices`);
        return;
      }
      
      markJobAsProcessed(jobId);
      onJobComplete(results, summary, jobId);
      console.log(`[BATCH MANAGER] Job ${jobId} processed successfully, marked as completed`);
      
    } finally {
      removeJobFromProcessing(jobId);
    }
  }, []);

  return {
    autoPollingJobs,
    setAutoPollingJobs,
    handleJobComplete
  };
};
