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

  const checkForRunawayJobs = useCallback(async () => {
    const now = Date.now();
    const CRITICAL_TIMEOUT = 4 * 60 * 60 * 1000; // 4 hours
    
    for (const job of jobs) {
      if (job.status !== 'in_progress') continue;
      
      const createdTime = new Date(job.created_at * 1000);
      const jobAge = now - createdTime.getTime();
      
      if (jobAge > CRITICAL_TIMEOUT) {
        productionLogger.error(`[TIMEOUT MANAGER] Detected runaway job ${job.id} running for ${Math.round(jobAge/60000)} minutes`, {
          jobId: job.id,
          jobAge: Math.round(jobAge/60000),
          progress: `${job.request_counts.completed}/${job.request_counts.total}`
        }, 'TIMEOUT_MANAGER');
        
        toast({
          title: "🚨 Critical Job Timeout",
          description: `Job ${job.id.substring(0, 8)}... has been running for over 4 hours and will be automatically canceled.`,
          variant: "destructive",
          duration: 15000,
        });
        
        try {
          onJobCancel(job.id);
          productionLogger.info(`[TIMEOUT MANAGER] Successfully initiated cancellation for runaway job ${job.id}`, undefined, 'TIMEOUT_MANAGER');
        } catch (error) {
          productionLogger.error(`[TIMEOUT MANAGER] Failed to cancel runaway job ${job.id}`, error, 'TIMEOUT_MANAGER');
        }
      }
    }
  }, [jobs, onJobCancel, toast]);

  // Check for runaway jobs every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      checkForRunawayJobs();
    }, 5 * 60 * 1000); // 5 minutes

    // Initial check
    checkForRunawayJobs();

    return () => clearInterval(interval);
  }, [checkForRunawayJobs]);

  return null; // This is a utility component with no UI
};

export default BatchJobTimeoutManager;