import { useToast } from '@/hooks/use-toast';
import { useBatchJobCancellation } from '@/hooks/useBatchJobCancellation';
import { useBatchJobStore } from '@/stores/batchJobStore';

export const useBatchJobActionsHandler = () => {
  const { toast } = useToast();

  const updateJob = useBatchJobStore(state => state.updateJob);
  const { handleCancelJob } = useBatchJobCancellation(updateJob);

  const handleCancel = async (jobId) => {
    try {
      await handleCancelJob(jobId);
      toast({
        title: "Job Cancelled",
        description: `Successfully cancelled job ${jobId.slice(0, 8)}...`,
      });
    } catch (error) {
      productionLogger.error('Failed to cancel job:', error);
      toast({
        title: "Cancellation Failed",
        description: "Failed to cancel the job. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleJobDelete = (jobId, removeJobFn) => {
    try {
      if (removeJobFn) {
        removeJobFn(jobId);
      }
      
      toast({
        title: "Job Deleted",
        description: `Job ${jobId.slice(0, 8)}... has been removed from the list.`,
      });
    } catch (error) {
      productionLogger.error('Failed to delete job:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete the job. Please try again.",
        variant: "destructive",
      });
    }
  };

  return {
    handleCancel,
    handleJobDelete
  };
};