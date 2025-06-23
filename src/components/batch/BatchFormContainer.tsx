
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { useBatchManager } from "@/hooks/useBatchManager";
import { useSimplifiedBatchForm } from "@/hooks/useSimplifiedBatchForm";
import BatchJobLoader from "./BatchJobLoader";
import BatchFormHeader from "./BatchFormHeader";
import BatchFormContent from "./BatchFormContent";

interface BatchFormContainerProps {
  onBatchClassify?: (results: PayeeClassification[]) => void;
  onComplete?: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
}

const BatchFormContainer = ({ onBatchClassify, onComplete }: BatchFormContainerProps) => {
  const batchManager = useBatchManager();
  const formState = useSimplifiedBatchForm();
  const [renderKey, setRenderKey] = useState(0);

  // Force re-render when jobs change
  useEffect(() => {
    setRenderKey(prev => prev + 1);
  }, [batchManager.jobs.length]);

  // Show loading until batch manager has loaded existing jobs
  if (!batchManager.isLoaded) {
    return (
      <BatchJobLoader 
        onJobsLoaded={() => {}}
        onLoadingComplete={() => {}}
      />
    );
  }

  const handleFileUploadBatchJob = async (batchJob: any, payeeRowData: any) => {
    // Job is already added to batchManager state in createBatch
    // Just switch to jobs tab to show it
    console.log(`[BATCH CONTAINER] Job ${batchJob.id} created, switching to jobs tab`);
    formState.setActiveTab("jobs");
    
    // Force a re-render to ensure the new job shows up
    setRenderKey(prev => prev + 1);
  };

  const handleJobComplete = (
    results: PayeeClassification[], 
    summary: BatchProcessingResult, 
    jobId: string
  ) => {
    console.log(`[BATCH CONTAINER] Job ${jobId} completed with ${results.length} results`);
    
    formState.handleJobComplete(results, summary);
    
    if (onBatchClassify) {
      onBatchClassify(results);
    }
    
    if (onComplete) {
      onComplete(results, summary);
    }
  };

  console.log(`[BATCH CONTAINER] Rendering with ${batchManager.jobs.length} jobs (key: ${renderKey})`);

  return (
    <Card key={renderKey}>
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
