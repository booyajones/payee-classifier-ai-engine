
import { useState } from "react";
import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { PayeeRowData } from "@/lib/rowMapping";

export const useBatchFormState = () => {
  const [batchResults, setBatchResults] = useState<PayeeClassification[]>([]);
  const [processingSummary, setProcessingSummary] = useState<BatchProcessingResult | null>(null);
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [payeeRowDataMap, setPayeeRowDataMap] = useState<Record<string, PayeeRowData>>({});

  return {
    batchResults,
    setBatchResults,
    processingSummary,
    setProcessingSummary,
    activeTab,
    setActiveTab,
    batchJobs,
    setBatchJobs,
    payeeRowDataMap,
    setPayeeRowDataMap,
  };
};
