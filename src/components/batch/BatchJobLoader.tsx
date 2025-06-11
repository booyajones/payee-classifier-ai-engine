
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
  const { toast } = useToast();

  useEffect(() => {
    loadJobsFromDatabase();
  }, []);

  const loadJobsFromDatabase = async () => {
    try {
      setIsLoading(true);
      
      const { jobs, payeeRowDataMap } = await loadAllBatchJobs();
      
      if (jobs.length === 0) {
        console.log('[BATCH LOADER] No saved jobs found in database');
        onLoadingComplete();
        return;
      }

      console.log(`[BATCH LOADER] Found ${jobs.length} saved jobs in database, checking status...`);

      const updatedJobs: BatchJob[] = [];
      const validPayeeRowDataMap: Record<string, PayeeRowData> = {};

      for (const job of jobs) {
        try {
          console.log(`[BATCH LOADER] Checking status of job ${job.id}`);
          const updatedJob = await checkBatchJobStatus(job.id);
          updatedJobs.push(updatedJob);
          validPayeeRowDataMap[job.id] = payeeRowDataMap[job.id];
          
          // Update database if status changed
          if (updatedJob.status !== job.status) {
            console.log(`[BATCH LOADER] Job ${job.id} status changed: ${job.status} -> ${updatedJob.status}`);
            await updateBatchJobStatus(updatedJob);
          }
          
          console.log(`[BATCH LOADER] Job ${job.id} preserved with complete payee row data`);
          
        } catch (error) {
          console.error(`[BATCH LOADER] Job ${job.id} no longer valid, but keeping data for recovery:`, error);
          updatedJobs.push(job);
          validPayeeRowDataMap[job.id] = payeeRowDataMap[job.id];
        }
      }

      onJobsLoaded(updatedJobs, validPayeeRowDataMap);

      if (updatedJobs.length > 0) {
        toast({
          title: "All Jobs Recovered",
          description: `Restored ${updatedJobs.length} batch job(s) with complete original data from database.`,
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
};

export default BatchJobLoader;
