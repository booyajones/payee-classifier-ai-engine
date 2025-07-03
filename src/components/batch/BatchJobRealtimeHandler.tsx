import { useCallback } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { useToast } from '@/hooks/use-toast';
import { useBatchJobRealtime } from '@/hooks/useBatchJobRealtime';

interface BatchJobRealtimeHandlerProps {
  onJobUpdate: (job: BatchJob) => void;
}

export const useBatchJobRealtimeHandler = ({ onJobUpdate }: BatchJobRealtimeHandlerProps) => {
  const { toast } = useToast();

  const handleRealtimeJobUpdate = useCallback((updatedJob: BatchJob) => {
    console.log('[REALTIME] Received job update:', updatedJob.id.substring(0, 8), 'status:', updatedJob.status);
    onJobUpdate(updatedJob);
    
    // Show toast notification for significant status changes
    // Only show toasts for valid OpenAI batch job IDs (length > 20 and starts with "batch_")
    if (['completed', 'failed', 'expired', 'cancelled'].includes(updatedJob.status) && 
        updatedJob.id.startsWith('batch_') && 
        updatedJob.id.length > 20) {
      toast({
        title: "Job Status Updated",
        description: `Batch job (...${updatedJob.id.slice(-8)}) is now ${updatedJob.status}`,
        variant: updatedJob.status === 'completed' ? 'default' : 'destructive'
      });
    }
  }, [onJobUpdate, toast]);

  // Enable real-time updates
  useBatchJobRealtime(handleRealtimeJobUpdate);
};