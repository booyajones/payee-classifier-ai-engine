
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { PayeeRowData } from "@/lib/rowMapping";
import { useBatchFormState } from "@/hooks/useBatchFormState";
import { useBatchFormActions } from "./useBatchFormActions";
import BatchJobLoader from "./BatchJobLoader";
import BatchFormHeader from "./BatchFormHeader";
import BatchFormContent from "./BatchFormContent";

interface BatchFormContainerProps {
  onBatchClassify?: (results: PayeeClassification[]) => void;
  onComplete?: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
}

const BatchFormContainer = ({ onBatchClassify, onComplete }: BatchFormContainerProps) => {
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  
  const formState = useBatchFormState();
  const formActions = useBatchFormActions(formState, { onBatchClassify, onComplete });

  const handleJobsLoaded = (jobs: BatchJob[], payeeDataMap: Record<string, PayeeRowData>) => {
    formState.setBatchJobs(jobs);
    formState.setPayeeRowDataMap(payeeDataMap);
    if (jobs.length > 0) {
      formState.setActiveTab("jobs");
    }
  };

  const handleLoadingComplete = () => {
    setIsLoadingJobs(false);
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
          batchJobs={formState.batchJobs}
          payeeRowDataMap={formState.payeeRowDataMap}
          batchResults={formState.batchResults}
          processingSummary={formState.processingSummary}
          onFileUploadBatchJob={formActions.handleFileUploadBatchJob}
          onJobUpdate={formActions.handleJobUpdate}
          onJobComplete={formActions.handleJobComplete}
          onJobDelete={formActions.handleJobDelete}
          onReset={formActions.resetForm}
        />
      </CardContent>
    </Card>
  );
};

export default BatchFormContainer;
