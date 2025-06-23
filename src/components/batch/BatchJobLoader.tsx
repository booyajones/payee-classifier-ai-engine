import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BatchJob, checkBatchJobStatus } from "@/lib/openai/trueBatchAPI";
import { PayeeRowData } from "@/lib/rowMapping";
import { loadAllBatchJobs, updateBatchJobStatus } from "@/lib/database/batchJobService";
import { useToast } from "@/components/ui/use-toast";

interface BatchJobLoaderProps {
  onJobsLoaded: (jobs: BatchJob[], payeeRowDataMap: Record<string, PayeeRowData>) => void;
  onLoadingComplete: () => void;
}

const BatchJobLoader = ({ onJobsLoaded, onLoadingComplete }: BatchJobLoaderProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Loading batch jobs from database...");
  const { toast } = useToast();

  useEffect(() => {
    loadJobsFromDatabase();
  }, []);

  const loadJobsFromDatabase = async () => {
    try {
      setIsLoading(true);
      setLoadingMessage("Connecting to database...");
      
      console.log('[BATCH LOADER] Starting to load all batch jobs from database');
      const { jobs, payeeRowDataMap } = await loadAllBatchJobs();
      
      if (jobs.length === 0) {
        console.log('[BATCH LOADER] No saved jobs found in database');
        setLoadingMessage("No previous jobs found");
        setTimeout(() => onLoadingComplete(), 1000);
        return;
      }

      console.log(`[BATCH LOADER] Found ${jobs.length} saved jobs in database, verifying status...`);
      setLoadingMessage(`Found ${jobs.length} batch jobs, checking status...`);

      const updatedJobs: BatchJob[] = [];
      const validPayeeRowDataMap: Record<string, PayeeRowData> = {};
      let updatedCount = 0;

      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        setLoadingMessage(`Checking job ${i + 1}/${jobs.length}: ${job.id.substring(0, 8)}...`);
        
        try {
          console.log(`[BATCH LOADER] Checking status of job ${job.id} (${job.status})`);
          
          // Only check OpenAI status for jobs that might have changed
          if (['validating', 'in_progress', 'finalizing'].includes(job.status)) {
            const updatedJob = await checkBatchJobStatus(job.id);
            
            if (updatedJob.status !== job.status) {
              console.log(`[BATCH LOADER] Job ${job.id} status changed: ${job.status} -> ${updatedJob.status}`);
              await updateBatchJobStatus(updatedJob);
              updatedCount++;
            }
            
            updatedJobs.push(updatedJob);
          } else {
            // Job is in final state, no need to check OpenAI
            updatedJobs.push(job);
          }
          
          validPayeeRowDataMap[job.id] = payeeRowDataMap[job.id];
          console.log(`[BATCH LOADER] Job ${job.id} preserved with complete payee row data (${payeeRowDataMap[job.id]?.uniquePayeeNames?.length || 0} payees)`);
          
        } catch (error) {
          console.error(`[BATCH LOADER] Job ${job.id} status check failed, but keeping data for recovery:`, error);
          // Keep the job data even if status check fails
          updatedJobs.push(job);
          validPayeeRowDataMap[job.id] = payeeRowDataMap[job.id];
        }
      }

      console.log(`[BATCH LOADER] Loaded ${updatedJobs.length} jobs, ${updatedCount} status updates made`);
      onJobsLoaded(updatedJobs, validPayeeRowDataMap);

      if (updatedJobs.length > 0) {
        const statusMessage = updatedCount > 0 
          ? `Restored ${updatedJobs.length} batch job(s) with ${updatedCount} status update(s)`
          : `Restored ${updatedJobs.length} batch job(s) with complete original data`;
          
        toast({
          title: "Jobs Loaded Successfully",
          description: statusMessage,
        });
      }

    } catch (error) {
      console.error('[BATCH LOADER] Error loading from database:', error);
      toast({
        title: "Database Error", 
        description: "Could not load job data from database. Please refresh the page.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      onLoadingComplete();
    }
  };

  if (!isLoading) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Payee Classification</CardTitle>
        <CardDescription>
          {loadingMessage}
        </CardDescription>
      </CardHeader>
      <CardContent className="py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">{loadingMessage}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default BatchJobLoader;
