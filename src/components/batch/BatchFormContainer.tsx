
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { useUnifiedBatchManager } from "@/hooks/useUnifiedBatchManager";
import { useSimplifiedBatchForm } from "@/hooks/useSimplifiedBatchForm";
import BatchJobLoader from "./BatchJobLoader";
import BatchFormHeader from "./BatchFormHeader";
import BatchFormContent from "./BatchFormContent";

interface BatchFormContainerProps {
  onBatchClassify?: (results: PayeeClassification[]) => void;
  onComplete?: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
}

const BatchFormContainer = ({ onBatchClassify, onComplete }: BatchFormContainerProps) => {
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  
  const batchManager = useUnifiedBatchManager();
  const formState = useSimplifiedBatchForm();

  const handleJobsLoaded = (jobs: any[], payeeDataMap: any) => {
    // Jobs are now managed by the unified batch manager
    if (jobs.length > 0) {
      formState.setActiveTab("jobs");
    }
  };

  const handleLoadingComplete = () => {
    setIsLoadingJobs(false);
  };

  const handleFileUploadBatchJob = async (batchJob: any, payeeRowData: any) => {
    // The unified manager already handles saving, so we just need to switch tabs
    formState.setActiveTab("jobs");
  };

  const handleJobComplete = (
    results: PayeeClassification[], 
    summary: BatchProcessingResult, 
    jobId: string
  ) => {
    formState.handleJobComplete(results, summary);
    
    if (onBatchClassify) {
      onBatchClassify(results);
    }
    
    if (onComplete) {
      onComplete(results, summary);
    }
  };

  if (isLoadingJobs) {
    return (
      <BatchJobLoader 
        onJobsLoaded={handleJobsLoaded}
        onLoadingComplete={handleLoadingComplete}
      />
    );
  }

  return (
    <Card>
      <BatchFormHeader />
      <CardContent>
        <BatchFormContent
          activeTab={formState.activeTab}
          onTabChange={formState.setActiveTab}
          batchJobs={batchManager.jobs}
          payeeRowDataMap={batchManager.payeeDataMap}
          batchResults={formState.batchResults}
          processingSummary={formState.processingSummary}
          onFileUploadBatchJob={handleFileUploadBatchJob}
          onJobUpdate={batchManager.updateJob}
          onJobComplete={handleJobComplete}
          onJobDelete={batchManager.deleteJob}
          onReset={formState.reset}
        />
      </CardContent>
    </Card>
  );
};

export default BatchFormContainer;
