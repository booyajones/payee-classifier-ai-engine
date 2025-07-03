import { useState } from 'react';

export const useBatchJobState = () => {
  const [processedJobs, setProcessedJobs] = useState(new Set());
  const [processingInProgress, setProcessingInProgress] = useState(new Set());

  const markJobAsProcessed = (jobId) => {
    setProcessedJobs((prev) => new Set(prev).add(jobId));
  };

  const markJobAsProcessing = (jobId) => {
    setProcessingInProgress((prev) => new Set(prev).add(jobId));
  };

  const removeJobFromProcessing = (jobId) => {
    setProcessingInProgress((prev) => {
      const newSet = new Set(prev);
      newSet.delete(jobId);
      return newSet;
    });
  };

  const isJobProcessed = (jobId) => processedJobs.has(jobId);
  const isJobProcessing = (jobId) => processingInProgress.has(jobId);

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