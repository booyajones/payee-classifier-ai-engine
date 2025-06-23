
import React, { useMemo, useCallback } from "react";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { PayeeRowData } from "@/lib/rowMapping";
import BatchFormTabs from "./BatchFormTabs";

interface BatchFormContentProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  batchJobs: BatchJob[];
  payeeRowDataMap: Record<string, PayeeRowData>;
  batchResults: PayeeClassification[];
  processingSummary: BatchProcessingResult | null;
  onFileUploadBatchJob: (batchJob: BatchJob, payeeRowData: PayeeRowData) => void;
  onJobUpdate: (job: BatchJob) => void;
  onJobComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
  onJobDelete: (jobId: string) => void;
  onReset: () => void;
}

const BatchFormContent = React.memo((props: BatchFormContentProps) => {
  const {
    activeTab,
    onTabChange,
    batchJobs,
    payeeRowDataMap,
    batchResults,
    processingSummary,
    onFileUploadBatchJob,
    onJobUpdate,
    onJobComplete,
    onJobDelete,
    onReset
  } = props;

  // Memoize tab change handler
  const handleTabChange = useCallback((tab: string) => {
    onTabChange(tab);
  }, [onTabChange]);

  // Memoize job handlers
  const handleJobUpdate = useCallback((job: BatchJob) => {
    onJobUpdate(job);
  }, [onJobUpdate]);

  const handleJobComplete = useCallback((
    results: PayeeClassification[], 
    summary: BatchProcessingResult, 
    jobId: string
  ) => {
    onJobComplete(results, summary, jobId);
  }, [onJobComplete]);

  const handleJobDelete = useCallback((jobId: string) => {
    onJobDelete(jobId);
  }, [onJobDelete]);

  const handleFileUploadBatchJob = useCallback((batchJob: BatchJob, payeeRowData: PayeeRowData) => {
    onFileUploadBatchJob(batchJob, payeeRowData);
  }, [onFileUploadBatchJob]);

  // Memoize props object to prevent unnecessary re-renders
  const tabProps = useMemo(() => ({
    activeTab,
    onTabChange: handleTabChange,
    batchJobs,
    payeeRowDataMap,
    batchResults,
    processingSummary,
    onFileUploadBatchJob: handleFileUploadBatchJob,
    onJobUpdate: handleJobUpdate,
    onJobComplete: handleJobComplete,
    onJobDelete: handleJobDelete,
    onReset
  }), [
    activeTab,
    handleTabChange,
    batchJobs,
    payeeRowDataMap,
    batchResults,
    processingSummary,
    handleFileUploadBatchJob,
    handleJobUpdate,
    handleJobComplete,
    handleJobDelete,
    onReset
  ]);

  return (
    <div className="space-y-6">
      <BatchFormTabs {...tabProps} />
    </div>
  );
});

BatchFormContent.displayName = 'BatchFormContent';

export default BatchFormContent;
