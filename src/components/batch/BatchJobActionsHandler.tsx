import { useToast } from '@/hooks/use-toast';
import { useBatchJobCancellation } from '@/hooks/useBatchJobCancellation';
import { useBatchJobStore } from '@/stores/batchJobStore';

export const useBatchJobActionsHandler = () => {
  const { toast } = useToast();

  const updateJob = useBatchJobStore(state => state.updateJob);
  const { handleCancelJob } = useBatchJobCancellation(updateJob);

  const handleCancel = async (jobId: string) => {
    try {
      await handleCancelJob(jobId);
      toast({
        title: "Job Cancelled",
        description: `Successfully cancelled job ${jobId.slice(0, 8)}...`,
      });
    } catch (error) {
      console.error('Failed to cancel job:', error);
      toast({
        title: "Cancel Failed",
        description: error instanceof Error ? error.message : 'Failed to cancel job',
        variant: "destructive"
      });
    }
  };

  const handleJobDelete = async (jobId: string, removeJob: (jobId: string) => void) => {
    try {
      // Delete from database first
      const { BatchJobDatabaseOperations } = await import('@/lib/database/batchJobDatabaseOperations');
      await BatchJobDatabaseOperations.deleteBatchJob(jobId);
      
      // Then remove from store
      removeJob(jobId);
      
      toast({
        title: "Job Deleted",
        description: `Permanently removed job ${jobId.slice(0, 8)}...`,
      });
    } catch (error) {
      console.error('Failed to delete job:', error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : 'Failed to delete job',
        variant: "destructive"
      });
    }
  };

  return {
    handleCancel,
    handleJobDelete
  };
};