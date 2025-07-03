import { useToast } from '@/hooks/use-toast';

export const useBatchJobActionsHandler = () => {
  const { toast } = useToast();

  const handleCancel = (jobId: string) => {
    // TODO: Implement cancel functionality
    toast({
      title: "Cancel Job",
      description: `Cancel functionality for job ${jobId.slice(0, 8)}... not yet implemented`,
      variant: "destructive"
    });
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
