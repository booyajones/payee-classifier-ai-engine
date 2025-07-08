import { useEffect, useCallback } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { useToast } from '@/hooks/use-toast';
import { productionLogger } from '@/lib/logging/productionLogger';

interface BatchJobTimeoutManagerProps {
  jobs: BatchJob[];
  onJobCancel: (jobId: string) => void;
}

export const BatchJobTimeoutManager = ({ jobs, onJobCancel }: BatchJobTimeoutManagerProps) => {
  const { toast } = useToast();

  const checkForStalledJobs = useCallback(async () => {
    const now = Date.now();
    const QUEUE_TIMEOUT = 4 * 60 * 60 * 1000; // 4 hours to start processing
    const PROGRESS_STALL_TIMEOUT = 6 * 60 * 60 * 1000; // 6 hours with no progress after starting
    
    for (const job of jobs) {
      if (job.status !== 'in_progress') continue;
      
      const createdTime = new Date(job.created_at * 1000);
      const jobAge = now - createdTime.getTime();
      const hasStartedProcessing = job.request_counts.completed > 0;
      
      // For jobs that haven't started processing, only warn after 4 hours
      if (!hasStartedProcessing && jobAge > QUEUE_TIMEOUT) {
        productionLogger.warn(`[TIMEOUT MANAGER] Job ${job.id} queued for ${Math.round(jobAge/60000)} minutes without starting processing`, {
          jobId: job.id,
          jobAge: Math.round(jobAge/60000),
          status: job.status
        }, 'TIMEOUT_MANAGER');
        
        toast({
          title: "⏳ Long Queue Time",
          description: `Job ${job.id.substring(0, 8)}... has been queued for ${Math.round(jobAge/60000)} minutes. OpenAI batch jobs can take several hours to start processing during high demand periods.`,
          duration: 10000,
        });
      }
      
      // For jobs that started but haven't made progress in 6+ hours, flag as potentially stalled
      if (hasStartedProcessing) {
        // Check when job last made progress (simplified - just check if it has any progress)
        const timeSinceProgress = jobAge; // We'd need more sophisticated tracking for actual last progress time
        
        if (timeSinceProgress > PROGRESS_STALL_TIMEOUT && job.request_counts.completed < job.request_counts.total * 0.1) {
          productionLogger.error(`[TIMEOUT MANAGER] Job ${job.id} appears genuinely stalled - no significant progress for ${Math.round(timeSinceProgress/60000)} minutes`, {
            jobId: job.id,
            timeSinceProgress: Math.round(timeSinceProgress/60000),
            progress: `${job.request_counts.completed}/${job.request_counts.total}`
          }, 'TIMEOUT_MANAGER');
          
          toast({
            title: "⚠️ Job May Be Stalled",
            description: `Job ${job.id.substring(0, 8)}... hasn't made progress in ${Math.round(timeSinceProgress/60000)} minutes. Consider manual cancellation if needed. OpenAI batch jobs can legitimately take 12-24+ hours for large batches.`,
            variant: "destructive",
            duration: 15000,
          });
        }
      }
    }
  }, [jobs, toast]);

  // Check for stalled jobs every 10 minutes (less aggressive)
  useEffect(() => {
    const interval = setInterval(() => {
      checkForStalledJobs();
    }, 10 * 60 * 1000); // 10 minutes

    // Initial check after 5 minutes to avoid immediate warnings
    const initialTimer = setTimeout(() => {
      checkForStalledJobs();
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimer);
    };
  }, [checkForStalledJobs]);

  return null; // This is a utility component with no UI
};

export default BatchJobTimeoutManager;