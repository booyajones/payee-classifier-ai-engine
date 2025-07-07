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
    
    // PERFORMANCE: Throttle updates for runaway jobs
    const createdTime = new Date(updatedJob.created_at * 1000);
    const jobAge = Date.now() - createdTime.getTime();
    const isRunawayJob = jobAge > 4 * 60 * 60 * 1000; // Over 4 hours
    
    if (isRunawayJob && updatedJob.status === 'in_progress') {
      console.warn(`[REALTIME] Throttling updates for runaway job ${updatedJob.id.substring(0, 8)} to prevent performance issues`);
      // Still update but less frequently - every 5th update
      if (Math.random() > 0.8) {
        onJobUpdate(updatedJob);
      }
      return;
    }
    
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