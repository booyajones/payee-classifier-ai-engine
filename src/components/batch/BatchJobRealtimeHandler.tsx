import { useCallback, useRef } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { useToast } from '@/hooks/use-toast';
import { useBatchJobRealtime } from '@/hooks/useBatchJobRealtime';

interface BatchJobRealtimeHandlerProps {
  onJobUpdate: (job: BatchJob) => void;
}

export const useBatchJobRealtimeHandler = ({ onJobUpdate }: BatchJobRealtimeHandlerProps) => {
  const { toast } = useToast();
  const completionNotifiedRef = useRef<Set<string>>(new Set());

  const handleRealtimeJobUpdate = useCallback((updatedJob: BatchJob) => {
    console.log('[REALTIME] Received job update:', updatedJob.id.substring(0, 8), 'status:', updatedJob.status);
    
    // EMERGENCY FIX: Allow ONE completion update per job, then block subsequent updates
    if (['completed', 'failed', 'cancelled', 'expired'].includes(updatedJob.status)) {
      if (completionNotifiedRef.current.has(updatedJob.id)) {
        console.warn(`[REALTIME] Completion already notified for ${updatedJob.status} job ${updatedJob.id.substring(0, 8)} - blocking duplicate`);
        return;
      }
      
      // Mark this job as completion-notified and allow this ONE update through
      completionNotifiedRef.current.add(updatedJob.id);
      console.log(`[REALTIME] EMERGENCY FIX: Allowing completion update for job ${updatedJob.id.substring(0, 8)} (${updatedJob.status})`);
      
      onJobUpdate(updatedJob);
      
      // Show toast notification for completion
      if (updatedJob.id.startsWith('batch_') && updatedJob.id.length > 20) {
        toast({
          title: "Job Status Updated",
          description: `Batch job (...${updatedJob.id.slice(-8)}) is now ${updatedJob.status}`,
          variant: updatedJob.status === 'completed' ? 'default' : 'destructive'
        });
      }
      return;
    }
    
    // CIRCUIT BREAKER: Block all updates for jobs older than 48 hours
    const createdTime = new Date(updatedJob.created_at * 1000);
    const jobAge = Date.now() - createdTime.getTime();
    const isExtremelyOldJob = jobAge > 48 * 60 * 60 * 1000; // Over 48 hours
    
    if (isExtremelyOldJob) {
      console.warn(`[REALTIME] CIRCUIT BREAKER: Blocking all updates for job ${updatedJob.id.substring(0, 8)} (age: ${Math.round(jobAge/3600000)}h) to prevent unresponsiveness`);
      return;
    }
    
    // AGGRESSIVE THROTTLING: For jobs over 24 hours, only process 1 in 20 updates
    const isVeryOldJob = jobAge > 24 * 60 * 60 * 1000; // Over 24 hours
    if (isVeryOldJob && updatedJob.status === 'in_progress') {
      console.warn(`[REALTIME] AGGRESSIVE THROTTLE: Very old job ${updatedJob.id.substring(0, 8)} (age: ${Math.round(jobAge/3600000)}h)`);
      if (Math.random() > 0.95) { // Only 5% of updates
        onJobUpdate(updatedJob);
      }
      return;
    }
    
    // MODERATE THROTTLING: For jobs over 12 hours, only process 1 in 5 updates
    const isOldJob = jobAge > 12 * 60 * 60 * 1000; // Over 12 hours
    if (isOldJob && updatedJob.status === 'in_progress') {
      console.warn(`[REALTIME] MODERATE THROTTLE: Old job ${updatedJob.id.substring(0, 8)} (age: ${Math.round(jobAge/3600000)}h)`);
      if (Math.random() > 0.8) { // Only 20% of updates
        onJobUpdate(updatedJob);
      }
      return;
    }
    
    onJobUpdate(updatedJob);
  }, [onJobUpdate, toast]);

  // Enable real-time updates
  useBatchJobRealtime(handleRealtimeJobUpdate);
};