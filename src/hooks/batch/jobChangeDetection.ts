import { useCallback, useRef } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { productionLogger } from '@/lib/logging/productionLogger';

interface JobState {
  status: string;
  completed: number;
  lastUpdate: number;
}

export const useJobChangeDetection = () => {
  const lastJobStatesRef = useRef<Record<string, JobState>>({});

  const hasJobChanged = useCallback((job: BatchJob): boolean => {
    const lastState = lastJobStatesRef.current[job.id];
    const now = Date.now();
    
    if (!lastState) {
      lastJobStatesRef.current[job.id] = { 
        status: job.status, 
        completed: job.request_counts.completed,
        lastUpdate: now
      };
      return true;
    }
    
    const hasStatusChange = lastState.status !== job.status;
    const hasProgressChange = lastState.completed !== job.request_counts.completed;
    const timeSinceLastUpdate = now - lastState.lastUpdate;
    
    // PERFORMANCE FIX: Reduce polling frequency for long-running jobs
    const createdTime = new Date(job.created_at * 1000);
    const jobAge = now - createdTime.getTime();
    const isOldJob = jobAge > 2 * 60 * 60 * 1000; // Over 2 hours old
    
    // RESPONSIVENESS FIX: Much shorter intervals for better UI updates
    const baseInterval = isOldJob ? 20000 : 10000; // 20s for old jobs, 10s for new (was 60s/30s)
    const shouldForceUpdate = job.status === 'in_progress' && timeSinceLastUpdate > baseInterval;
    
    const hasChanged = hasStatusChange || hasProgressChange || shouldForceUpdate;
    
    if (hasChanged) {
      lastJobStatesRef.current[job.id] = { 
        status: job.status, 
        completed: job.request_counts.completed,
        lastUpdate: now
      };
      
      // Log reduced activity for performance monitoring
      if (isOldJob) {
        productionLogger.debug(`Reduced polling for old job ${job.id.substring(0, 8)}`, { jobAge: Math.round(jobAge/60000) }, 'BATCH_POLLING');
      }
    }
    
    return hasChanged;
  }, []);

  return { hasJobChanged };
};