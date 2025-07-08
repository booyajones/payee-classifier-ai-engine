import { useToast } from "@/hooks/use-toast";
import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { BatchJobLoader } from "@/lib/database/batchJobLoader";

/**
 * Hook for emergency force sync of job status from database
 */
export const useBatchJobForceSync = (onJobUpdate: (job: BatchJob) => void) => {
  const { toast } = useToast();

  const handleForceStatusSync = async (jobId: string) => {
    console.log(`[FORCE SYNC] Emergency status sync for job ${jobId.substring(0, 8)}`);
    
    try {
      const dbJob = await BatchJobLoader.loadBatchJobById(jobId);
      if (dbJob) {
        console.log(`[FORCE SYNC] Found job ${jobId.substring(0, 8)} with status: ${dbJob.status}`);
        onJobUpdate(dbJob);
        
        toast({
          title: "Status Synchronized",
          description: `Job ${jobId.substring(0, 8)}... status synced from database: ${dbJob.status}`,
          variant: "default",
        });
        
        return dbJob;
      } else {
        throw new Error('Job not found in database');
      }
    } catch (error) {
      console.error(`[FORCE SYNC] Error syncing job ${jobId.substring(0, 8)}:`, error);
      toast({
        title: "Sync Failed",
        description: `Could not sync status for job ${jobId.substring(0, 8)}...`,
        variant: "destructive",
      });
      throw error;
    }
  };

  return { handleForceStatusSync };
};