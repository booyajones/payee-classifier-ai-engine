
import { useCallback } from 'react';
import { deleteBatchJob } from '@/lib/database/batchJobService';
import { useToast } from '@/hooks/use-toast';
import { handleError } from '@/lib/errorHandler';
import { emitBatchJobUpdate } from './useBatchJobEventEmitter';

export const useBatchJobDeletion = (
  removeJob: (jobId: string) => void,
  clearError: (key: string) => void,
  setError: (key: string, error: string) => void
) => {
  const { toast } = useToast();

  const deleteJob = useCallback(async (jobId: string) => {
    try {
      console.log(`[JOB DELETION] Deleting job ${jobId} from database and local state`);
      
      // Clear any previous errors for this job
      clearError(jobId);
      
      // Delete from database first
      await deleteBatchJob(jobId);
      console.log(`[JOB DELETION] Successfully deleted job ${jobId} from database`);
      
      // Remove from local state
      removeJob(jobId);
      
      // Emit update to refresh UI
      emitBatchJobUpdate();
      
      // Show success toast
      toast({
        title: "Job Deleted",
        description: "Batch job has been successfully removed.",
      });
      
    } catch (error) {
      console.error(`[JOB DELETION] Error deleting job ${jobId}:`, error);
      
      const appError = handleError(error, 'Job Deletion');
      setError(jobId, appError.message);
      
      // Show error toast
      toast({
        title: "Delete Failed",
        description: `Failed to delete batch job: ${appError.message}`,
        variant: "destructive",
      });
    }
  }, [removeJob, clearError, setError, toast]);

  return { deleteJob };
};
