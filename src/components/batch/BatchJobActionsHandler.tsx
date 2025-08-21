import { useToast } from '@/hooks/use-toast';
import { useBatchJobStore } from '@/stores/batchJobStore';

export const useBatchJobActionsHandler = () => {
  const { toast } = useToast();
  const { getJob, updateJob, setProcessing } = useBatchJobStore();

  const handleCancel = async (jobId: string) => {
    const job = getJob(jobId);

    if (!job) {
      toast({
        title: 'Cancel Failed',
        description: `Job ${jobId.slice(0, 8)}... not found`,
        variant: 'destructive'
      });
      return;
    }

    if (['completed', 'cancelled'].includes(job.status)) {
      toast({
        title: 'Cannot Cancel',
        description: `Job ${jobId.slice(0, 8)}... is already ${job.status}.`,
        variant: 'destructive'
      });
      return;
    }

    try {
      setProcessing(jobId, true);
      const { cancelBatchJob } = await import('@/lib/openai/trueBatchAPI');
      const cancelledJob = await cancelBatchJob(jobId);
      updateJob(cancelledJob);

      toast({
        title: 'Job Cancelled',
        description: `Successfully cancelled job ${jobId.slice(0, 8)}...`
      });
    } catch (error) {
      console.error('Failed to cancel job:', error);
      toast({
        title: 'Cancel Failed',
        description: error instanceof Error ? error.message : 'Failed to cancel job',
        variant: 'destructive'
      });
    } finally {
      setProcessing(jobId, false);
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
        title: 'Job Deleted',
        description: `Permanently removed job ${jobId.slice(0, 8)}...`
      });
    } catch (error) {
      console.error('Failed to delete job:', error);
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete job',
        variant: 'destructive'
      });
    }
  };

  return {
    handleCancel,
    handleJobDelete
  };
};

