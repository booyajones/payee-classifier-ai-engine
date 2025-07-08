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
    
    // PERFORMANCE: Prevent unresponsiveness by throttling updates for problematic jobs
    const createdTime = new Date(updatedJob.created_at * 1000);
    const jobAge = Date.now() - createdTime.getTime();
    const isVeryOldJob = jobAge > 24 * 60 * 60 * 1000; // Over 24 hours
    const isExtremelyOldJob = jobAge > 48 * 60 * 60 * 1000; // Over 48 hours
    
    // Block updates from extremely old jobs that could cause unresponsiveness
    if (isExtremelyOldJob && updatedJob.status === 'in_progress') {
      console.warn(`[REALTIME] Blocking updates for extremely old job ${updatedJob.id.substring(0, 8)} to prevent unresponsiveness`);
      return; // Don't process this update at all
    }
    
    // Heavily throttle very old jobs
    if (isVeryOldJob && updatedJob.status === 'in_progress') {
      console.warn(`[REALTIME] Heavily throttling updates for very old job ${updatedJob.id.substring(0, 8)}`);
      // Only process 1 in 10 updates for very old jobs
      if (Math.random() > 0.9) {
        onJobUpdate(updatedJob);
      }
      return;
    }
    
    // Light throttling for jobs over 4 hours
    const isOldJob = jobAge > 4 * 60 * 60 * 1000;
    if (isOldJob && updatedJob.status === 'in_progress') {
      // Only process 1 in 3 updates for old jobs
      if (Math.random() > 0.66) {
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