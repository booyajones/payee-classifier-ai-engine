
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { PayeeRowData } from "@/lib/rowMapping";
import { 
  saveBatchJob, 
  updateBatchJobStatus, 
  deleteBatchJob 
} from "@/lib/database/batchJobService";
import { useBatchFormState } from "@/hooks/useBatchFormState";
import BatchJobLoader from "./batch/BatchJobLoader";
import BatchFormTabs from "./batch/BatchFormTabs";

interface BatchClassificationFormProps {
  onBatchClassify?: (results: PayeeClassification[]) => void;
  onComplete?: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
}

const BatchClassificationForm = ({ onBatchClassify, onComplete }: BatchClassificationFormProps) => {
  const {
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
  } = useBatchFormState();

  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const { toast } = useToast();

  const handleJobsLoaded = (jobs: BatchJob[], payeeDataMap: Record<string, PayeeRowData>) => {
    setBatchJobs(jobs);
    setPayeeRowDataMap(payeeDataMap);
    if (jobs.length > 0) {
      setActiveTab("jobs");
    }
  };

  const handleLoadingComplete = () => {
    setIsLoadingJobs(false);
  };

  const resetForm = async () => {
    try {
      // Clear all jobs from database
      const deletePromises = batchJobs.map(job => deleteBatchJob(job.id));
      await Promise.all(deletePromises);
      
      // Clear local state
      setBatchResults([]);
      setProcessingSummary(null);
      setBatchJobs([]);
      setPayeeRowDataMap({});
      
      toast({
        title: "Form Reset",
        description: "All batch jobs and data have been cleared from the database.",
      });
    } catch (error) {
      console.error('[BATCH FORM] Error clearing jobs from database:', error);
      toast({
        title: "Reset Error",
        description: "Failed to clear some jobs from database. Please refresh the page.",
        variant: "destructive"
      });
    }
  };

  const handleFileUploadBatchJob = async (batchJob: BatchJob, payeeRowData: PayeeRowData) => {
    console.log(`[BATCH FORM] Adding new batch job with complete payee row data:`, {
      jobId: batchJob.id,
      uniquePayeeCount: payeeRowData.uniquePayeeNames.length,
      originalDataCount: payeeRowData.originalFileData.length,
      mappingCount: payeeRowData.rowMappings.length
    });
    
    try {
      // Save to database
      await saveBatchJob(batchJob, payeeRowData);
      
      // Update local state
      setBatchJobs(prev => {
        const newJobs = [...prev, batchJob];
        console.log(`[BATCH FORM] Updated batch jobs count: ${newJobs.length}`);
        return newJobs;
      });
      
      setPayeeRowDataMap(prev => {
        const newMap = { ...prev, [batchJob.id]: payeeRowData };
        console.log(`[BATCH FORM] Added payee row data for job ${batchJob.id}`);
        return newMap;
      });
      
      setActiveTab("jobs");
      
      toast({
        title: "Batch Job Saved",
        description: `Job ${batchJob.id.slice(-8)} saved to database successfully.`,
      });
    } catch (error) {
      console.error('[BATCH FORM] Error saving batch job to database:', error);
      toast({
        title: "Save Error",
        description: "Failed to save batch job to database. Job may be lost on refresh.",
        variant: "destructive"
      });
      
      // Still update local state as fallback
      setBatchJobs(prev => [...prev, batchJob]);
      setPayeeRowDataMap(prev => ({ ...prev, [batchJob.id]: payeeRowData }));
      setActiveTab("jobs");
    }
  };

  const handleJobUpdate = async (updatedJob: BatchJob) => {
    console.log(`[BATCH FORM] Updating job:`, updatedJob);
    
    try {
      // Update database
      await updateBatchJobStatus(updatedJob);
      
      // Update local state
      setBatchJobs(prev => {
        const newJobs = prev.map(job => job.id === updatedJob.id ? updatedJob : job);
        console.log(`[BATCH FORM] Updated batch jobs after update:`, newJobs);
        return newJobs;
      });
    } catch (error) {
      console.error('[BATCH FORM] Error updating job in database:', error);
      // Still update local state
      setBatchJobs(prev => prev.map(job => job.id === updatedJob.id ? updatedJob : job));
    }
  };

  const handleJobComplete = (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => {
    console.log(`[BATCH FORM] Job ${jobId} completed with ${results.length} results`);
    
    setBatchResults(results);
    setProcessingSummary(summary);
    
    if (onBatchClassify) {
      onBatchClassify(results);
    }
    
    if (onComplete) {
      onComplete(results, summary);
    }
    
    setActiveTab("results");
  };

  const handleJobDelete = async (jobId: string) => {
    console.log(`[BATCH FORM] Deleting job: ${jobId}`);
    
    try {
      // Delete from database
      await deleteBatchJob(jobId);
      
      // Update local state
      setBatchJobs(prev => {
        const newJobs = prev.filter(job => job.id !== jobId);
        console.log(`[BATCH FORM] Batch jobs after deletion:`, newJobs);
        return newJobs;
      });
      setPayeeRowDataMap(prev => {
        const newMap = { ...prev };
        delete newMap[jobId];
        console.log(`[BATCH FORM] Payee row data map after deletion:`, newMap);
        return newMap;
      });
      
      toast({
        title: "Job Deleted",
        description: `Job ${jobId.slice(-8)} removed from database.`,
      });
    } catch (error) {
      console.error('[BATCH FORM] Error deleting job from database:', error);
      toast({
        title: "Delete Error",
        description: "Failed to delete job from database.",
        variant: "destructive"
      });
    }
  };

  console.log(`[BATCH FORM] RENDER - Active tab: ${activeTab}, Batch jobs: ${batchJobs.length}, Results: ${batchResults.length}, Loading: ${isLoadingJobs}`);

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
      <CardHeader>
        <CardTitle>Payee Classification System</CardTitle>
        <CardDescription>
          Upload files for automatic payee classification with intelligent processing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <BatchFormTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          batchJobs={batchJobs}
          payeeRowDataMap={payeeRowDataMap}
          batchResults={batchResults}
          processingSummary={processingSummary}
          onFileUploadBatchJob={handleFileUploadBatchJob}
          onJobUpdate={handleJobUpdate}
          onJobComplete={handleJobComplete}
          onJobDelete={handleJobDelete}
          onReset={resetForm}
        />
      </CardContent>
    </Card>
  );
};

export default BatchClassificationForm;
