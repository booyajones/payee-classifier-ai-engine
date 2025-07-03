
import { useState } from 'react';

export const useBatchJobState = () => {
  const [processedJobs, setProcessedJobs] = useState<Set<string>>(new Set());
  const [processingInProgress, setProcessingInProgress] = useState<Set<string>>(new Set());

  const markJobAsProcessed = (jobId: string) => {
    setProcessedJobs(prev => new Set(prev).add(jobId));
  };

  const markJobAsProcessing = (jobId: string) => {
    setProcessingInProgress(prev => new Set(prev).add(jobId));
  };

  const removeJobFromProcessing = (jobId: string) => {
    setProcessingInProgress(prev => {
      const newSet = new Set(prev);
      newSet.delete(jobId);
      return newSet;
    });
  };

  const isJobProcessed = (jobId: string) => processedJobs.has(jobId);
  const isJobProcessing = (jobId: string) => processingInProgress.has(jobId);

  return {
    processedJobs,
    processingInProgress,
    markJobAsProcessed,
    markJobAsProcessing,
    removeJobFromProcessing,
    isJobProcessed,
    isJobProcessing
  };
};
