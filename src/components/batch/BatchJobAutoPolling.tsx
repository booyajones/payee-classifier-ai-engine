
import { useEffect } from 'react';

interface BatchJobAutoPollingProps {
  jobs: any[];
  autoPollingJobs: Set<string>;
  setAutoPollingJobs: (jobs: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  handleRefreshJob: (jobId: string) => void;
}

export const useBatchJobAutoPolling = ({
  jobs,
  autoPollingJobs,
  setAutoPollingJobs,
  handleRefreshJob
}: BatchJobAutoPollingProps) => {
  useEffect(() => {
    const activeStates = ['validating', 'in_progress', 'finalizing'];
    const newAutoPollingJobs = new Set<string>();

    jobs.forEach(job => {
      if (activeStates.includes(job.status) && !autoPollingJobs.has(job.id)) {
        console.log(`[AUTO POLLING] Starting auto-refresh for job ${job.id} with status: ${job.status}`);
        newAutoPollingJobs.add(job.id);
        
        // Start auto-refresh for this job
        const startAutoRefresh = () => {
          const refreshInterval = setInterval(() => {
            const currentJob = jobs.find(j => j.id === job.id);
            if (!currentJob || !activeStates.includes(currentJob.status)) {
              console.log(`[AUTO POLLING] Stopping auto-refresh for job ${job.id} - status: ${currentJob?.status || 'not found'}`);
              clearInterval(refreshInterval);
              setAutoPollingJobs(prev => {
                const newSet = new Set(prev);
                newSet.delete(job.id);
                return newSet;
              });
              return;
            }
            
            console.log(`[AUTO POLLING] Auto-refreshing job ${job.id}`);
            handleRefreshJob(job.id);
          }, 15000); // Refresh every 15 seconds

          // Clean up interval after 30 minutes to prevent infinite polling
          setTimeout(() => {
            console.log(`[AUTO POLLING] Timeout reached for job ${job.id}, stopping auto-refresh`);
            clearInterval(refreshInterval);
            setAutoPollingJobs(prev => {
              const newSet = new Set(prev);
              newSet.delete(job.id);
              return newSet;
            });
          }, 30 * 60 * 1000); // 30 minutes
        };

        startAutoRefresh();
      }
    });

    setAutoPollingJobs(prev => new Set([...prev, ...newAutoPollingJobs]));

    // Cleanup function
    return () => {
      // Intervals are cleaned up by the individual jobs when they complete or timeout
    };
  }, [jobs, handleRefreshJob, autoPollingJobs, setAutoPollingJobs]);
};
