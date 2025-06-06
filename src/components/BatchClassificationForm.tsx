
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { PayeeClassification, BatchProcessingResult, ClassificationConfig } from "@/lib/types";
import FileUploadForm from "./FileUploadForm";
import BatchJobManager from "./BatchJobManager";
import BatchResultsDisplay from "./BatchResultsDisplay";
import { BatchJob, checkBatchJobStatus } from "@/lib/openai/trueBatchAPI";

interface BatchClassificationFormProps {
  onBatchClassify?: (results: PayeeClassification[]) => void;
  onComplete?: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
}

const STORAGE_KEYS = {
  BATCH_JOBS: 'batch_classification_jobs',
  PAYEE_NAMES_MAP: 'batch_classification_payee_names',
  ORIGINAL_FILE_DATA_MAP: 'batch_classification_original_data'
};

const BatchClassificationForm = ({ onBatchClassify, onComplete }: BatchClassificationFormProps) => {
  const [batchResults, setBatchResults] = useState<PayeeClassification[]>([]);
  const [processingSummary, setProcessingSummary] = useState<BatchProcessingResult | null>(null);
  const [activeTab, setActiveTab] = useState<string>("file");
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [payeeNamesMap, setPayeeNamesMap] = useState<Record<string, string[]>>({});
  const [originalFileDataMap, setOriginalFileDataMap] = useState<Record<string, any[]>>({});
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

  // Save state to localStorage
  const saveToStorage = (jobs: BatchJob[], payeeMap: Record<string, string[]>, fileDataMap: Record<string, any[]>) => {
    try {
      localStorage.setItem(STORAGE_KEYS.BATCH_JOBS, JSON.stringify(jobs));
      localStorage.setItem(STORAGE_KEYS.PAYEE_NAMES_MAP, JSON.stringify(payeeMap));
      localStorage.setItem(STORAGE_KEYS.ORIGINAL_FILE_DATA_MAP, JSON.stringify(fileDataMap));
      console.log(`[BATCH FORM] Saved ${jobs.length} jobs with original data to localStorage`);
    } catch (error) {
      console.error('[BATCH FORM] Error saving to localStorage:', error);
    }
  };

  // Load and recover jobs from localStorage
  const loadFromStorage = async () => {
    try {
      const savedJobs = localStorage.getItem(STORAGE_KEYS.BATCH_JOBS);
      const savedPayeeMap = localStorage.getItem(STORAGE_KEYS.PAYEE_NAMES_MAP);
      const savedFileDataMap = localStorage.getItem(STORAGE_KEYS.ORIGINAL_FILE_DATA_MAP);

      if (!savedJobs || !savedPayeeMap) {
        console.log('[BATCH FORM] No saved jobs found');
        setIsLoadingJobs(false);
        return;
      }

      const jobs: BatchJob[] = JSON.parse(savedJobs);
      const payeeMap: Record<string, string[]> = JSON.parse(savedPayeeMap);
      const fileDataMap: Record<string, any[]> = savedFileDataMap ? JSON.parse(savedFileDataMap) : {};

      console.log(`[BATCH FORM] Found ${jobs.length} saved jobs with original data, checking status...`);

      // Check status of each saved job
      const updatedJobs: BatchJob[] = [];
      const validPayeeMap: Record<string, string[]> = {};
      const validFileDataMap: Record<string, any[]> = {};

      for (const job of jobs) {
        try {
          console.log(`[BATCH FORM] Checking status of job ${job.id}`);
          const updatedJob = await checkBatchJobStatus(job.id);
          updatedJobs.push(updatedJob);
          validPayeeMap[job.id] = payeeMap[job.id] || [];
          validFileDataMap[job.id] = fileDataMap[job.id] || [];
          
          if (updatedJob.status !== job.status) {
            console.log(`[BATCH FORM] Job ${job.id} status changed: ${job.status} -> ${updatedJob.status}`);
          }
        } catch (error) {
          console.error(`[BATCH FORM] Job ${job.id} no longer valid, removing:`, error);
          // Job is invalid/expired, don't include it
        }
      }

      setBatchJobs(updatedJobs);
      setPayeeNamesMap(validPayeeMap);
      setOriginalFileDataMap(validFileDataMap);

      // Save the cleaned up state
      saveToStorage(updatedJobs, validPayeeMap, validFileDataMap);

      if (updatedJobs.length > 0) {
        setActiveTab("jobs");
        toast({
          title: "Jobs Recovered",
          description: `Restored ${updatedJobs.length} batch job(s) with original data from previous session.`,
        });
      }

    } catch (error) {
      console.error('[BATCH FORM] Error loading from localStorage:', error);
      // Clear corrupted data
      localStorage.removeItem(STORAGE_KEYS.BATCH_JOBS);
      localStorage.removeItem(STORAGE_KEYS.PAYEE_NAMES_MAP);
      localStorage.removeItem(STORAGE_KEYS.ORIGINAL_FILE_DATA_MAP);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  // Load jobs on component mount
  useEffect(() => {
    loadFromStorage();
  }, []);

  // Save jobs whenever they change
  useEffect(() => {
    if (!isLoadingJobs && batchJobs.length > 0) {
      saveToStorage(batchJobs, payeeNamesMap, originalFileDataMap);
    }
  }, [batchJobs, payeeNamesMap, originalFileDataMap, isLoadingJobs]);

  const resetForm = () => {
    setBatchResults([]);
    setProcessingSummary(null);
    setBatchJobs([]);
    setPayeeNamesMap({});
    setOriginalFileDataMap({});
    
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEYS.BATCH_JOBS);
    localStorage.removeItem(STORAGE_KEYS.PAYEE_NAMES_MAP);
    localStorage.removeItem(STORAGE_KEYS.ORIGINAL_FILE_DATA_MAP);
    
    toast({
      title: "Form Reset",
      description: "The batch classification form has been reset. You can now start over.",
    });
  };

  const handleFileUploadBatchJob = (batchJob: BatchJob, payeeNames: string[], originalFileData: any[]) => {
    console.log(`[BATCH FORM] File upload batch job created with original data:`, batchJob);
    
    setBatchJobs(prev => {
      const newJobs = [...prev, batchJob];
      console.log(`[BATCH FORM] Updated batch jobs from file upload:`, newJobs);
      return newJobs;
    });
    
    setPayeeNamesMap(prev => {
      const newMap = { ...prev, [batchJob.id]: payeeNames };
      console.log(`[BATCH FORM] Updated payee names map from file upload:`, newMap);
      return newMap;
    });
    
    setOriginalFileDataMap(prev => {
      const newMap = { ...prev, [batchJob.id]: originalFileData };
      console.log(`[BATCH FORM] Updated original file data map:`, newMap);
      return newMap;
    });
    
    setActiveTab("jobs");
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
    console.log(`[BATCH FORM] Job ${jobId} completed with ${results.length} results including original data`);
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
    setPayeeNamesMap(prev => {
      const newMap = { ...prev };
      delete newMap[jobId];
      console.log(`[BATCH FORM] Payee names map after deletion:`, newMap);
      return newMap;
    });
    setOriginalFileDataMap(prev => {
      const newMap = { ...prev };
      delete newMap[jobId];
      console.log(`[BATCH FORM] Original file data map after deletion:`, newMap);
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
            Loading previous batch jobs...
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Checking for previous batch jobs...</p>
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
          Upload files for payee classification processing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="file">File Upload</TabsTrigger>
            <TabsTrigger value="jobs">
              Batch Jobs {batchJobs.length > 0 && `(${batchJobs.length})`}
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
                payeeNamesMap={payeeNamesMap}
                originalFileDataMap={originalFileDataMap}
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
