import { useState, useRef, useCallback, useEffect } from 'react';
import { BatchJob, checkBatchJobStatus } from '@/lib/openai/trueBatchAPI';
import { connectionManager } from '@/lib/network/connectionManager';
import { useToast } from '@/hooks/use-toast';
import { useBatchJobRealtime } from '@/hooks/useBatchJobRealtime';

interface AutoRefreshState {
  isPolling: boolean;
  lastPoll: number;
  pollCount: number;
  consecutiveErrors: number;
  lastStatus?: string;
  lastProgress?: number;
}

interface AutoRefreshConfig {
  pollingInterval: number;
  maxConsecutiveErrors: number;
  backoffMultiplier: number;
  maxBackoffInterval: number;
}

/**
 * Unified auto-refresh system that combines polling and real-time updates
 * Eliminates conflicts between multiple polling systems
 */
export const useUnifiedAutoRefresh = (
  jobs: BatchJob[],
  onJobUpdate: (job: BatchJob) => void
) => {
  const { toast } = useToast();
  const [refreshStates, setRefreshStates] = useState<Record<string, AutoRefreshState>>({});
  const pollTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const orchestratorRef = useRef<NodeJS.Timeout | null>(null);
  const completionNotifiedRef = useRef<Set<string>>(new Set());
  const lastUpdateRef = useRef<Record<string, { status: string; progress: number; timestamp: number }>>({});
  
  const config: AutoRefreshConfig = {
    pollingInterval: 15000, // 15 seconds
    maxConsecutiveErrors: 3,
    backoffMultiplier: 1.5,
    maxBackoffInterval: 60000 // 1 minute max
  };

  // Enhanced job validation with better ID checking
  const isValidJob = useCallback((job: BatchJob): boolean => {
    if (!job || !job.id) return false;
    
    // Accept both short and long job IDs
    const isShortId = job.id.length >= 8 && job.id.length <= 12; // e.g., "92bd1772"
    const isLongId = job.id.startsWith('batch_') && job.id.length > 20; // e.g., "batch_686e908b..."
    
    return isShortId || isLongId;
  }, []);

  // Check if job should be actively polled
  const shouldPollJob = useCallback((job: BatchJob): boolean => {
    if (!isValidJob(job)) return false;
    
    // Always poll active jobs regardless of network health (with fallback)
    const isActiveJob = ['validating', 'in_progress', 'finalizing'].includes(job.status);
    if (!isActiveJob) return false;
    
    const state = refreshStates[job.id];
    
    // Skip if too many consecutive errors
    if (state?.consecutiveErrors >= config.maxConsecutiveErrors) {
      return false;
    }
    
    return true;
  }, [refreshStates, config, isValidJob]);

  // Unified job status checking with better error handling
  const checkJobStatus = useCallback(async (job: BatchJob): Promise<BatchJob | null> => {
    try {
      // Use connection manager for better reliability
      const updatedJob = await connectionManager.executeWithRetry(
        () => checkBatchJobStatus(job.id),
        `auto-refresh-${job.id.slice(-8)}`
      );
      
      return updatedJob;
    } catch (error) {
      console.warn(`[AUTO-REFRESH] Failed to check status for job ${job.id.slice(-8)}:`, error);
      return null;
    }
  }, []);

  // Process job updates with deduplication
  const processJobUpdate = useCallback((updatedJob: BatchJob, source: 'polling' | 'realtime') => {
    const jobId = updatedJob.id;
    const lastUpdate = lastUpdateRef.current[jobId];
    const now = Date.now();
    
    // Calculate meaningful change detection
    const currentProgress = updatedJob.request_counts.total > 0 
      ? (updatedJob.request_counts.completed / updatedJob.request_counts.total) * 100 
      : 0;
    
    const hasStatusChange = !lastUpdate || lastUpdate.status !== updatedJob.status;
    const hasProgressChange = !lastUpdate || Math.abs(lastUpdate.progress - currentProgress) > 2; // 2% threshold
    const isTimeBased = !lastUpdate || (now - lastUpdate.timestamp) > 30000; // 30 seconds
    
    const shouldUpdate = hasStatusChange || hasProgressChange || isTimeBased;
    
    if (shouldUpdate) {
      console.log(`[AUTO-REFRESH] ${source.toUpperCase()} update for job ${jobId.slice(-8)}: status=${updatedJob.status}, progress=${currentProgress.toFixed(1)}%`);
      
      // Update tracking
      lastUpdateRef.current[jobId] = {
        status: updatedJob.status,
        progress: currentProgress,
        timestamp: now
      };
      
      // Apply the update
      onJobUpdate(updatedJob);
      
      // Show completion notification (once per job)
      if (['completed', 'failed'].includes(updatedJob.status) && !completionNotifiedRef.current.has(jobId)) {
        completionNotifiedRef.current.add(jobId);
        toast({
          title: "Job Status Updated",
          description: `Batch job ${jobId.slice(-8)} is now ${updatedJob.status}`,
          variant: updatedJob.status === 'completed' ? 'default' : 'destructive'
        });
      }
    } else {
      console.log(`[AUTO-REFRESH] ${source.toUpperCase()} update skipped for job ${jobId.slice(-8)} (no meaningful change)`);
    }
  }, [onJobUpdate, toast]);

  // Polling logic for individual jobs
  const pollJob = useCallback(async (job: BatchJob) => {
    const jobId = job.id;
    
    setRefreshStates(prev => ({
      ...prev,
      [jobId]: {
        ...prev[jobId],
        isPolling: true,
        lastPoll: Date.now(),
        pollCount: (prev[jobId]?.pollCount || 0) + 1
      }
    }));

    try {
      const updatedJob = await checkJobStatus(job);
      
      if (updatedJob) {
        processJobUpdate(updatedJob, 'polling');
        
        // Reset error count on success
        setRefreshStates(prev => ({
          ...prev,
          [jobId]: {
            ...prev[jobId],
            isPolling: false,
            consecutiveErrors: 0,
            lastStatus: updatedJob.status,
            lastProgress: updatedJob.request_counts.total > 0 
              ? (updatedJob.request_counts.completed / updatedJob.request_counts.total) * 100 
              : 0
          }
        }));
      }
    } catch (error) {
      console.warn(`[AUTO-REFRESH] Polling error for job ${jobId.slice(-8)}:`, error);
      
      setRefreshStates(prev => ({
        ...prev,
        [jobId]: {
          ...prev[jobId],
          isPolling: false,
          consecutiveErrors: (prev[jobId]?.consecutiveErrors || 0) + 1
        }
      }));
    }
  }, [checkJobStatus, processJobUpdate]);

  // Schedule polling for a job with backoff
  const scheduleJobPoll = useCallback((job: BatchJob) => {
    const jobId = job.id;
    
    // Clear existing timer
    if (pollTimersRef.current[jobId]) {
      clearTimeout(pollTimersRef.current[jobId]);
    }

    if (!shouldPollJob(job)) {
      return;
    }

    const state = refreshStates[jobId];
    let interval = config.pollingInterval;

    // Apply exponential backoff for jobs with errors
    if (state?.consecutiveErrors > 0) {
      interval = Math.min(
        interval * Math.pow(config.backoffMultiplier, state.consecutiveErrors),
        config.maxBackoffInterval
      );
      console.log(`[AUTO-REFRESH] Backoff for job ${jobId.slice(-8)}: ${interval}ms (errors: ${state.consecutiveErrors})`);
    }

    pollTimersRef.current[jobId] = setTimeout(() => {
      pollJob(job);
    }, interval);
  }, [shouldPollJob, refreshStates, pollJob, config]);

  // Real-time update handler with reduced throttling
  const handleRealtimeUpdate = useCallback((updatedJob: BatchJob) => {
    if (!isValidJob(updatedJob)) {
      console.warn('[AUTO-REFRESH] Invalid job from realtime:', updatedJob?.id);
      return;
    }
    
    // Only minimal throttling for very old jobs (over 7 days)
    const jobAge = Date.now() - (updatedJob.created_at * 1000);
    const isExtremelyOld = jobAge > 7 * 24 * 60 * 60 * 1000;
    
    if (isExtremelyOld && Math.random() > 0.5) {
      console.log(`[AUTO-REFRESH] Throttling extremely old job ${updatedJob.id.slice(-8)} (${Math.round(jobAge/86400000)} days)`);
      return;
    }
    
    processJobUpdate(updatedJob, 'realtime');
  }, [isValidJob, processJobUpdate]);

  // Main orchestrator
  useEffect(() => {
    const orchestrate = () => {
      // Filter valid jobs
      const validJobs = jobs.filter(isValidJob);
      
      // Schedule polling for active jobs
      validJobs.forEach(job => {
        if (shouldPollJob(job)) {
          scheduleJobPoll(job);
        }
      });
      
      // Clean up states for non-existent jobs
      const validJobIds = new Set(validJobs.map(j => j.id));
      setRefreshStates(prev => {
        const cleaned: Record<string, AutoRefreshState> = {};
        Object.entries(prev).forEach(([jobId, state]) => {
          if (validJobIds.has(jobId)) {
            cleaned[jobId] = state;
          }
        });
        return cleaned;
      });
      
      // Schedule next orchestration
      orchestratorRef.current = setTimeout(orchestrate, 30000); // Every 30 seconds
    };
    
    // Start orchestration
    orchestratorRef.current = setTimeout(orchestrate, 2000); // Start after 2 seconds
    
    return () => {
      if (orchestratorRef.current) {
        clearTimeout(orchestratorRef.current);
      }
      
      Object.values(pollTimersRef.current).forEach(timer => {
        clearTimeout(timer);
      });
      pollTimersRef.current = {};
    };
  }, [jobs, isValidJob, shouldPollJob, scheduleJobPoll]);

  // Manual refresh functionality
  const manualRefresh = useCallback(async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job || !isValidJob(job)) {
      console.warn(`[AUTO-REFRESH] Cannot manually refresh invalid job: ${jobId}`);
      return;
    }
    
    // Clear any scheduled poll and do immediate poll
    if (pollTimersRef.current[jobId]) {
      clearTimeout(pollTimersRef.current[jobId]);
      delete pollTimersRef.current[jobId];
    }
    
    await pollJob(job);
  }, [jobs, isValidJob, pollJob]);

  // Enable real-time updates
  useBatchJobRealtime(handleRealtimeUpdate);

  return {
    refreshStates,
    manualRefresh,
    isHealthy: connectionManager.isHealthy()
  };
};