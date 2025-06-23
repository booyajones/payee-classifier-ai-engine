
import { useToast } from "@/components/ui/use-toast";
import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { PayeeRowData } from "@/lib/rowMapping";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { 
  saveBatchJob, 
  updateBatchJobStatus, 
  deleteBatchJob 
} from "@/lib/database/batchJobService";

interface BatchFormState {
  setBatchResults: (results: PayeeClassification[]) => void;
  setProcessingSummary: (summary: BatchProcessingResult | null) => void;
  setActiveTab: (tab: string) => void;
  setBatchJobs: (jobs: BatchJob[] | ((prev: BatchJob[]) => BatchJob[])) => void;
  setPayeeRowDataMap: (map: Record<string, PayeeRowData> | ((prev: Record<string, PayeeRowData>) => Record<string, PayeeRowData>)) => void;
  batchJobs: BatchJob[];
}

interface BatchFormCallbacks {
  onBatchClassify?: (results: PayeeClassification[]) => void;
  onComplete?: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
}

export const useBatchFormActions = (
  formState: BatchFormState,
  callbacks: BatchFormCallbacks
) => {
  const { toast } = useToast();

  const resetForm = async () => {
    try {
      const deletePromises = formState.batchJobs.map(job => deleteBatchJob(job.id));
      await Promise.all(deletePromises);
      
      formState.setBatchResults([]);
      formState.setProcessingSummary(null);
      formState.setBatchJobs([]);
      formState.setPayeeRowDataMap({});
      
      toast({
        title: "Form Reset",
        description: "All batch jobs and data have been cleared.",
      });
    } catch (error) {
      console.error('[BATCH FORM] Error clearing jobs:', error);
      toast({
        title: "Reset Error",
        description: "Failed to clear some jobs. Please refresh the page.",
        variant: "destructive"
      });
    }
  };

  const handleFileUploadBatchJob = async (batchJob: BatchJob, payeeRowData: PayeeRowData) => {
    try {
      await saveBatchJob(batchJob, payeeRowData);
      
      formState.setBatchJobs(prev => [...prev, batchJob]);
      formState.setPayeeRowDataMap(prev => ({ ...prev, [batchJob.id]: payeeRowData }));
      formState.setActiveTab("jobs");
      
      toast({
        title: "Batch Job Saved",
        description: `Job ${batchJob.id.slice(-8)} saved successfully.`,
      });
    } catch (error) {
      console.error('[BATCH FORM] Error saving batch job:', error);
      toast({
        title: "Save Error",
        description: "Failed to save batch job.",
        variant: "destructive"
      });
    }
  };

  const handleJobUpdate = async (updatedJob: BatchJob) => {
    try {
      await updateBatchJobStatus(updatedJob);
      formState.setBatchJobs(prev => 
        prev.map(job => job.id === updatedJob.id ? updatedJob : job)
      );
    } catch (error) {
      console.error('[BATCH FORM] Error updating job:', error);
      formState.setBatchJobs(prev => 
        prev.map(job => job.id === updatedJob.id ? updatedJob : job)
      );
    }
  };

  const handleJobComplete = (
    results: PayeeClassification[], 
    summary: BatchProcessingResult, 
    jobId: string
  ) => {
    formState.setBatchResults(results);
    formState.setProcessingSummary(summary);
    
    if (callbacks.onBatchClassify) {
      callbacks.onBatchClassify(results);
    }
    
    if (callbacks.onComplete) {
      callbacks.onComplete(results, summary);
    }
    
    formState.setActiveTab("results");
  };

  const handleJobDelete = async (jobId: string) => {
    try {
      await deleteBatchJob(jobId);
      
      formState.setBatchJobs(prev => prev.filter(job => job.id !== jobId));
      formState.setPayeeRowDataMap(prev => {
        const newMap = { ...prev };
        delete newMap[jobId];
        return newMap;
      });
      
      toast({
        title: "Job Deleted",
        description: `Job ${jobId.slice(-8)} removed.`,
      });
    } catch (error) {
      console.error('[BATCH FORM] Error deleting job:', error);
      toast({
        title: "Delete Error",
        description: "Failed to delete job.",
        variant: "destructive"
      });
    }
  };

  return {
    resetForm,
    handleFileUploadBatchJob,
    handleJobUpdate,
    handleJobComplete,
    handleJobDelete
  };
};
