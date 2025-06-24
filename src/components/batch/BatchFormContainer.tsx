
import { useState, useEffect, useCallback } from "react";
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
  onJobDelete?: () => void;
}

const BatchFormContainer = ({ onBatchClassify, onComplete, onJobDelete }: BatchFormContainerProps) => {
  const batchManager = useBatchManager();
  const formState = useSimplifiedBatchForm();

  console.log(`[BATCH CONTAINER] Rendering with ${batchManager.jobs.length} jobs, isLoaded: ${batchManager.isLoaded}`);

  // Move all hooks before any conditional logic
  const handleFileUploadBatchJob = useCallback(async (batchJob: any, payeeRowData: any) => {
    if (batchJob) {
      console.log(`[BATCH CONTAINER] Real batch job ${batchJob.id} created, switching to jobs tab`);
    } else {
      console.log(`[BATCH CONTAINER] Local processing completed, switching to jobs tab for visibility`);
    }
    
    // Small delay to ensure state propagation before switching tabs
    await new Promise(resolve => setTimeout(resolve, 100));
    
    formState.setActiveTab("jobs");
    
    console.log(`[BATCH CONTAINER] Switched to jobs tab, current job count: ${batchManager.jobs.length}`);
  }, [formState, batchManager.jobs.length]);

  const handleJobComplete = useCallback((
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
  }, [formState, onBatchClassify, onComplete]);

  const handleJobDelete = useCallback((jobId: string) => {
    console.log(`[BATCH CONTAINER] Job ${jobId} deleted, calling parent onJobDelete`);
    
    // Call the batch manager's delete function
    batchManager.deleteJob(jobId);
    
    // Call the parent's onJobDelete to clear summary
    if (onJobDelete) {
      onJobDelete();
    }
  }, [batchManager, onJobDelete]);

  // Show loading until batch manager has loaded existing jobs
  if (!batchManager.isLoaded) {
    return (
      <BatchJobLoader 
        onJobsLoaded={() => {}}
        onLoadingComplete={() => {}}
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
          onJobDelete={handleJobDelete}
          onReset={formState.reset}
        />
      </CardContent>
    </Card>
  );
};

export default BatchFormContainer;
