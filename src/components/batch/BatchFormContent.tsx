
import React from "react";
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

const BatchFormContent = (props: BatchFormContentProps) => {
  console.log(`[BATCH FORM CONTENT] Rendering with ${props.batchJobs.length} jobs`);

  return (
    <div className="space-y-6">
      <BatchFormTabs {...props} />
    </div>
  );
};

export default BatchFormContent;
