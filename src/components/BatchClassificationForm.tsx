
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { PayeeClassification, BatchProcessingResult, ClassificationConfig } from "@/lib/types";
import FileUploadForm from "./FileUploadForm";
import BatchJobManager from "./BatchJobManager";
import BatchResultsDisplay from "./BatchResultsDisplay";
import { BatchJob, checkBatchJobStatus } from "@/lib/openai/trueBatchAPI";
import { PayeeRowData } from "@/lib/rowMapping";

interface BatchClassificationFormProps {
  onBatchClassify?: (results: PayeeClassification[]) => void;
  onComplete?: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
}

const STORAGE_KEYS = {
  BATCH_JOBS: 'batch_classification_jobs',
  PAYEE_ROW_DATA_MAP: 'batch_classification_payee_row_data'
};

const BatchClassificationForm = ({ onBatchClassify, onComplete }: BatchClassificationFormProps) => {
  const [batchResults, setBatchResults] = useState<PayeeClassification[]>([]);
  const [processingSummary, setProcessingSummary] = useState<BatchProcessingResult | null>(null);
  const [activeTab, setActiveTab] = useState<string>("file");
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [payeeRowDataMap, setPayeeRowDataMap] = useState<Record<string, PayeeRowData>>({});
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const { toast } = useToast();

  const config: ClassificationConfig = {
    aiThreshold: 80,
    bypassRuleNLP: true,
    useEnhanced: true,
    offlineMode: false,
    useFuzzyMatching: true,
    similarityThreshold: 85
  };

  // Save ALL job data to localStorage
  const saveToStorage = (jobs: BatchJob[], payeeRowDataMap: Record<string, PayeeRowData>) => {
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          localStorage.setItem(STORAGE_KEYS.BATCH_JOBS, JSON.stringify(jobs));
          localStorage.setItem(STORAGE_KEYS.PAYEE_ROW_DATA_MAP, JSON.stringify(payeeRowDataMap));
          console.log(`[BATCH FORM] Successfully saved ${jobs.length} jobs with complete payee row data (attempt ${attempt + 1})`);
          return;
        } catch (saveError) {
          console.warn(`[BATCH FORM] Save attempt ${attempt + 1} failed:`, saveError);
          if (attempt === 2) throw saveError;
        }
      }
    } catch (error) {
      console.error('[BATCH FORM] CRITICAL: Failed to save job data after 3 attempts:', error);
      toast({
        title: "Storage Warning",
        description: "Failed to save job data to browser storage. Jobs may be lost on refresh.",
        variant: "destructive",
      });
    }
  };

  // Load and recover jobs from localStorage
  const loadFromStorage = async () => {
    try {
      const savedJobs = localStorage.getItem(STORAGE_KEYS.BATCH_JOBS);
      const savedPayeeRowDataMap = localStorage.getItem(STORAGE_KEYS.PAYEE_ROW_DATA_MAP);

      if (!savedJobs || !savedPayeeRowDataMap) {
        console.log('[BATCH FORM] No saved jobs found');
        setIsLoadingJobs(false);
        return;
      }

      const jobs: BatchJob[] = JSON.parse(savedJobs);
      const payeeRowDataMap: Record<string, PayeeRowData> = JSON.parse(savedPayeeRowDataMap);

      console.log(`[BATCH FORM] Found ${jobs.length} saved jobs with complete payee row data, checking status...`);

      const updatedJobs: BatchJob[] = [];
      const validPayeeRowDataMap: Record<string, PayeeRowData> = {};

      for (const job of jobs) {
        try {
          console.log(`[BATCH FORM] Checking status of job ${job.id}`);
          const updatedJob = await checkBatchJobStatus(job.id);
          updatedJobs.push(updatedJob);
          validPayeeRowDataMap[job.id] = payeeRowDataMap[job.id];
          
          console.log(`[BATCH FORM] Job ${job.id} preserved with complete payee row data`);
          
          if (updatedJob.status !== job.status) {
            console.log(`[BATCH FORM] Job ${job.id} status changed: ${job.status} -> ${updatedJob.status}`);
          }
        } catch (error) {
          console.error(`[BATCH FORM] Job ${job.id} no longer valid, but keeping data for recovery:`, error);
          updatedJobs.push(job);
          validPayeeRowDataMap[job.id] = payeeRowDataMap[job.id];
        }
      }

      setBatchJobs(updatedJobs);
      setPayeeRowDataMap(validPayeeRowDataMap);

      saveToStorage(updatedJobs, validPayeeRowDataMap);

      if (updatedJobs.length > 0) {
        setActiveTab("jobs");
        toast({
          title: "All Jobs Recovered",
          description: `Restored ${updatedJobs.length} batch job(s) with complete original data from previous session.`,
        });
      }

    } catch (error) {
      console.error('[BATCH FORM] Error loading from localStorage:', error);
      toast({
        title: "Recovery Warning", 
        description: "Some job data could not be recovered from previous session.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingJobs(false);
    }
  };

  // Load jobs on component mount
  useEffect(() => {
    loadFromStorage();
  }, []);

  // Save jobs whenever they change (with debouncing)
  useEffect(() => {
    if (!isLoadingJobs && batchJobs.length > 0) {
      const timeoutId = setTimeout(() => {
        saveToStorage(batchJobs, payeeRowDataMap);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [batchJobs, payeeRowDataMap, isLoadingJobs]);

  const resetForm = () => {
    setBatchResults([]);
    setProcessingSummary(null);
    setBatchJobs([]);
    setPayeeRowDataMap({});
    
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEYS.BATCH_JOBS);
    localStorage.removeItem(STORAGE_KEYS.PAYEE_ROW_DATA_MAP);
    
    toast({
      title: "Form Reset",
      description: "All batch jobs and data have been cleared. You can now start over.",
    });
  };

  const handleFileUploadBatchJob = (batchJob: BatchJob, payeeRowData: PayeeRowData) => {
    console.log(`[BATCH FORM] Adding new batch job with complete payee row data:`, {
      jobId: batchJob.id,
      uniquePayeeCount: payeeRowData.uniquePayeeNames.length,
      originalDataCount: payeeRowData.originalFileData.length,
      mappingCount: payeeRowData.rowMappings.length
    });
    
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
      title: "Job Created & Saved",
      description: `Batch job created with ${payeeRowData.uniquePayeeNames.length} unique payees from ${payeeRowData.originalFileData.length} rows. All data saved to browser storage.`,
    });
  };

  const handleJobUpdate = (updatedJob: BatchJob) => {
    console.log(`[BATCH FORM] Updating job:`, updatedJob);
    setBatchJobs(prev => {
      const newJobs = prev.map(job => job.id === updatedJob.id ? updatedJob : job);
      console.log(`[BATCH FORM] Updated batch jobs after update:`, newJobs);
      return newJobs;
    });
  };

  const handleJobComplete = (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => {
    console.log(`[BATCH FORM] Job ${jobId} completed with ${results.length} results`, {
      allHaveOriginalData: results.every(r => !!r.originalData),
      allHaveKeywordExclusion: results.every(r => !!r.result.keywordExclusion),
      summaryHasOriginalData: !!summary.originalFileData
    });
    
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

  const handleJobDelete = (jobId: string) => {
    console.log(`[BATCH FORM] Deleting job: ${jobId}`);
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
  };

  console.log(`[BATCH FORM] RENDER - Active tab: ${activeTab}, Batch jobs: ${batchJobs.length}, Results: ${batchResults.length}, Loading: ${isLoadingJobs}`);

  if (isLoadingJobs) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Batch Payee Classification</CardTitle>
          <CardDescription>
            Loading and verifying all saved batch jobs...
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
        <CardTitle>Batch Payee Classification</CardTitle>
        <CardDescription>
          Upload files for payee classification processing. All jobs and data are automatically saved.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="file">File Upload</TabsTrigger>
            <TabsTrigger value="jobs">
              Batch Jobs {batchJobs.length > 0 && `(${batchJobs.length} saved)`}
            </TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>
          
          <TabsContent value="file" className="mt-4">
            <FileUploadForm 
              onBatchJobCreated={handleFileUploadBatchJob}
              config={config}
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
