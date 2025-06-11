
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import SmartFileUpload from "./SmartFileUpload";
import BatchJobManager from "./BatchJobManager";
import BatchResultsDisplay from "./BatchResultsDisplay";
import { BatchJob, checkBatchJobStatus } from "@/lib/openai/trueBatchAPI";
import { PayeeRowData } from "@/lib/rowMapping";
import { 
  saveBatchJob, 
  updateBatchJobStatus, 
  loadAllBatchJobs, 
  deleteBatchJob 
} from "@/lib/database/batchJobService";

interface BatchClassificationFormProps {
  onBatchClassify?: (results: PayeeClassification[]) => void;
  onComplete?: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
}

const BatchClassificationForm = ({ onBatchClassify, onComplete }: BatchClassificationFormProps) => {
  const [batchResults, setBatchResults] = useState<PayeeClassification[]>([]);
  const [processingSummary, setProcessingSummary] = useState<BatchProcessingResult | null>(null);
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [payeeRowDataMap, setPayeeRowDataMap] = useState<Record<string, PayeeRowData>>({});
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const { toast } = useToast();

  // Load jobs from database on component mount
  useEffect(() => {
    loadJobsFromDatabase();
  }, []);

  const loadJobsFromDatabase = async () => {
    try {
      setIsLoadingJobs(true);
      
      const { jobs, payeeRowDataMap } = await loadAllBatchJobs();
      
      if (jobs.length === 0) {
        console.log('[BATCH FORM] No saved jobs found in database');
        setIsLoadingJobs(false);
        return;
      }

      console.log(`[BATCH FORM] Found ${jobs.length} saved jobs in database, checking status...`);

      const updatedJobs: BatchJob[] = [];
      const validPayeeRowDataMap: Record<string, PayeeRowData> = {};

      for (const job of jobs) {
        try {
          console.log(`[BATCH FORM] Checking status of job ${job.id}`);
          const updatedJob = await checkBatchJobStatus(job.id);
          updatedJobs.push(updatedJob);
          validPayeeRowDataMap[job.id] = payeeRowDataMap[job.id];
          
          // Update database if status changed
          if (updatedJob.status !== job.status) {
            console.log(`[BATCH FORM] Job ${job.id} status changed: ${job.status} -> ${updatedJob.status}`);
            await updateBatchJobStatus(updatedJob);
          }
          
          console.log(`[BATCH FORM] Job ${job.id} preserved with complete payee row data`);
          
        } catch (error) {
          console.error(`[BATCH FORM] Job ${job.id} no longer valid, but keeping data for recovery:`, error);
          updatedJobs.push(job);
          validPayeeRowDataMap[job.id] = payeeRowDataMap[job.id];
        }
      }

      setBatchJobs(updatedJobs);
      setPayeeRowDataMap(validPayeeRowDataMap);

      if (updatedJobs.length > 0) {
        setActiveTab("jobs");
        toast({
          title: "All Jobs Recovered",
          description: `Restored ${updatedJobs.length} batch job(s) with complete original data from database.`,
        });
      }

    } catch (error) {
      console.error('[BATCH FORM] Error loading from database:', error);
      toast({
        title: "Database Error", 
        description: "Could not load job data from database. Please refresh the page.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingJobs(false);
    }
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
      <Card>
        <CardHeader>
          <CardTitle>Batch Payee Classification</CardTitle>
          <CardDescription>
            Loading and verifying all saved batch jobs from database...
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Checking for previous batch jobs and data...</p>
          </div>
        </CardContent>
      </Card>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">File Upload</TabsTrigger>
            <TabsTrigger value="jobs">
              Batch Jobs {batchJobs.length > 0 && `(${batchJobs.length})`}
            </TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="mt-4">
            <SmartFileUpload 
              onBatchJobCreated={handleFileUploadBatchJob}
              onProcessingComplete={handleJobComplete}
            />
          </TabsContent>

          <TabsContent value="jobs" className="mt-4">
            {batchJobs.length === 0 ? (
              <div className="text-center py-8 border rounded-md">
                <p className="text-muted-foreground">
                  No batch jobs yet. Upload a file to see jobs here.
                </p>
              </div>
            ) : (
              <BatchJobManager
                jobs={batchJobs}
                payeeRowDataMap={payeeRowDataMap}
                onJobUpdate={handleJobUpdate}
                onJobComplete={handleJobComplete}
                onJobDelete={handleJobDelete}
              />
            )}
          </TabsContent>
          
          <TabsContent value="results" className="mt-4">
            <BatchResultsDisplay
              batchResults={batchResults}
              processingSummary={processingSummary}
              onReset={resetForm}
              isProcessing={false}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default BatchClassificationForm;
