import { useCallback, useEffect, useState } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { productionLogger } from '@/lib/logging/productionLogger';

interface LargeJobOptimizationState {
  optimizedPollingIntervals: Record<string, number>;
  pausedJobs: Set<string>;
  notificationPreferences: Record<string, boolean>;
}

export const useLargeJobOptimization = () => {
  const [state, setState] = useState<LargeJobOptimizationState>({
    optimizedPollingIntervals: {},
    pausedJobs: new Set(),
    notificationPreferences: {}
  });

  // Calculate optimal polling interval for a job
  const calculateOptimalInterval = useCallback((job: BatchJob): number => {
    const createdTime = new Date(job.created_at * 1000);
    const ageInHours = (Date.now() - createdTime.getTime()) / (1000 * 60 * 60);
    const isVeryLargeJob = job.request_counts.total > 5000;
    const isLargeJob = job.request_counts.total > 1000;
    const progress = job.request_counts.total > 0 ? 
      job.request_counts.completed / job.request_counts.total : 0;

    // Base intervals (in milliseconds)
    let baseInterval = 30000; // 30 seconds default

    // Adjust for job size
    if (isVeryLargeJob) {
      baseInterval = 120000; // 2 minutes for very large jobs
    } else if (isLargeJob) {
      baseInterval = 60000; // 1 minute for large jobs
    }

    // Adjust for job age
    if (ageInHours > 12) {
      baseInterval *= 4; // Every 4x normal interval for very old jobs
    } else if (ageInHours > 4) {
      baseInterval *= 2; // Every 2x normal interval for old jobs
    }

    // Adjust for progress - more frequent polling when actively progressing
    if (progress > 0 && progress < 0.1) {
      baseInterval *= 0.75; // Slightly more frequent when starting to progress
    } else if (progress === 0 && ageInHours > 1) {
      baseInterval *= 2; // Less frequent when no progress for a while
    }

    // Cap the maximum interval
    const maxInterval = 600000; // 10 minutes max
    const minInterval = 15000; // 15 seconds min

    return Math.min(Math.max(baseInterval, minInterval), maxInterval);
  }, []);

  // Get optimized polling interval for a job
  const getPollingInterval = useCallback((job: BatchJob): number => {
    if (state.pausedJobs.has(job.id)) {
      return 300000; // 5 minutes for paused jobs
    }

    const cachedInterval = state.optimizedPollingIntervals[job.id];
    if (cachedInterval) {
      return cachedInterval;
    }

    return calculateOptimalInterval(job);
  }, [state.optimizedPollingIntervals, state.pausedJobs, calculateOptimalInterval]);

  // Update polling interval for a job
  const updatePollingInterval = useCallback((jobId: string, interval: number) => {
    setState(prev => ({
      ...prev,
      optimizedPollingIntervals: {
        ...prev.optimizedPollingIntervals,
        [jobId]: interval
      }
    }));
  }, []);

  // Toggle polling for a job
  const toggleJobPolling = useCallback((jobId: string) => {
    setState(prev => {
      const newPausedJobs = new Set(prev.pausedJobs);
      if (newPausedJobs.has(jobId)) {
        newPausedJobs.delete(jobId);
        productionLogger.info(`Resumed polling for job ${jobId}`, null, 'LARGE_JOB_OPTIMIZATION');
      } else {
        newPausedJobs.add(jobId);
        productionLogger.info(`Paused polling for job ${jobId}`, null, 'LARGE_JOB_OPTIMIZATION');
      }
      
      return {
        ...prev,
        pausedJobs: newPausedJobs
      };
    });
  }, []);

  // Toggle notifications for a job
  const toggleJobNotifications = useCallback((jobId: string) => {
    setState(prev => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [jobId]: !prev.notificationPreferences[jobId]
      }
    }));
  }, []);

  // Check if job should show notifications
  const shouldShowNotifications = useCallback((jobId: string): boolean => {
    return state.notificationPreferences[jobId] !== false; // Default to true
  }, [state.notificationPreferences]);

  // Get optimization recommendations for a job
  const getOptimizationRecommendations = useCallback((job: BatchJob) => {
    const createdTime = new Date(job.created_at * 1000);
    const ageInHours = (Date.now() - createdTime.getTime()) / (1000 * 60 * 60);
    const isVeryLargeJob = job.request_counts.total > 5000;
    const progress = job.request_counts.total > 0 ? 
      job.request_counts.completed / job.request_counts.total : 0;
    
    const recommendations = [];

    if (ageInHours > 4 && !state.pausedJobs.has(job.id)) {
      recommendations.push({
        type: 'efficiency',
        title: 'Reduce Polling Frequency',
        description: 'This long-running job could benefit from less frequent updates to save resources.',
        action: () => toggleJobPolling(job.id),
        actionLabel: 'Pause Auto-Updates'
      });
    }

    if (isVeryLargeJob && progress < 0.05) {
      recommendations.push({
        type: 'expectation',
        title: 'Set Realistic Expectations',
        description: 'Very large jobs typically take 24-48+ hours. Consider checking back later.',
        action: () => toggleJobNotifications(job.id),
        actionLabel: 'Enable Completion Notifications'
      });
    }

    if (progress === 0 && ageInHours > 1) {
      recommendations.push({
        type: 'action',
        title: 'Check Job Status',
        description: 'No progress detected for over an hour. Manual refresh might help.',
        action: null,
        actionLabel: 'Manual Refresh Recommended'
      });
    }

    return recommendations;
  }, [state.pausedJobs, toggleJobPolling, toggleJobNotifications]);

  // Auto-optimize intervals based on job changes
  useEffect(() => {
    const optimizeInterval = setInterval(() => {
      setState(prev => {
        const newIntervals = { ...prev.optimizedPollingIntervals };
        let hasChanges = false;

        Object.keys(newIntervals).forEach(jobId => {
          // Remove intervals for jobs that are likely completed or removed
          // This cleanup helps prevent memory leaks
          const lastUpdate = Date.now() - (newIntervals[jobId] || 0);
          if (lastUpdate > 24 * 60 * 60 * 1000) { // 24 hours
            delete newIntervals[jobId];
            hasChanges = true;
          }
        });

        return hasChanges ? { ...prev, optimizedPollingIntervals: newIntervals } : prev;
      });
    }, 60 * 60 * 1000); // Cleanup every hour

    return () => clearInterval(optimizeInterval);
  }, []);

  return {
    getPollingInterval,
    updatePollingInterval,
    toggleJobPolling,
    toggleJobNotifications,
    shouldShowNotifications,
    getOptimizationRecommendations,
    isJobPollingPaused: (jobId: string) => state.pausedJobs.has(jobId),
    isJobNotificationsEnabled: (jobId: string) => shouldShowNotifications(jobId)
  };
};