
import { useState, useEffect, useRef } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';

interface TimeoutState {
  isStuck: boolean;
  timeElapsed: number;
  lastProgressTime: Date;
  shouldTimeout: boolean;
}

const STUCK_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours
const WARNING_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export const useBatchJobTimeout = (jobs: BatchJob[]) => {
  const [timeoutStates, setTimeoutStates] = useState<Record<string, TimeoutState>>({});
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Initialize timeout states for new jobs
    jobs.forEach(job => {
      if (!timeoutStates[job.id]) {
        const now = new Date();
        setTimeoutStates(prev => ({
          ...prev,
          [job.id]: {
            isStuck: false,
            timeElapsed: 0,
            lastProgressTime: new Date(job.in_progress_at ? job.in_progress_at * 1000 : job.created_at * 1000),
            shouldTimeout: false
          }
        }));
      }
    });

    // Start monitoring timer
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      
      setTimeoutStates(prev => {
        const updated = { ...prev };
        
        jobs.forEach(job => {
          const state = updated[job.id];
          if (!state) return;

          // Calculate time elapsed since last progress
          const lastProgressTime = job.in_progress_at 
            ? new Date(job.in_progress_at * 1000)
            : new Date(job.created_at * 1000);
          
          const timeElapsed = now - lastProgressTime.getTime();
          
          // Update progress tracking when job advances
          const hasProgressed = job.request_counts.completed > 0;
          if (hasProgressed && !state.lastProgressTime) {
            state.lastProgressTime = new Date();
          }

          updated[job.id] = {
            ...state,
            timeElapsed,
            isStuck: timeElapsed > WARNING_THRESHOLD_MS && ['in_progress', 'validating'].includes(job.status),
            shouldTimeout: timeElapsed > STUCK_THRESHOLD_MS && ['in_progress', 'validating'].includes(job.status)
          };
        });
        
        return updated;
      });
    }, 30000); // Check every 30 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [jobs]);

  const getTimeoutState = (jobId: string): TimeoutState => {
    return timeoutStates[jobId] || {
      isStuck: false,
      timeElapsed: 0,
      lastProgressTime: new Date(),
      shouldTimeout: false
    };
  };

  const isJobStuck = (jobId: string): boolean => {
    return getTimeoutState(jobId).isStuck;
  };

  const shouldJobTimeout = (jobId: string): boolean => {
    return getTimeoutState(jobId).shouldTimeout;
  };

  const getFormattedElapsedTime = (jobId: string): string => {
    const elapsed = getTimeoutState(jobId).timeElapsed;
    const minutes = Math.floor(elapsed / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  return {
    getTimeoutState,
    isJobStuck,
    shouldJobTimeout,
    getFormattedElapsedTime
  };
};
