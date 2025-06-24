
import { useEffect } from 'react';
import { loadAllBatchJobs } from '@/lib/database/batchJobService';

export const useBatchJobLoader = (
  updateJobs: (jobs: any[]) => void,
  updatePayeeDataMap: (map: Record<string, any>) => void,
  setLoaded: (loaded: boolean) => void
) => {
  useEffect(() => {
    const loadExistingJobs = async () => {
      try {
        console.log('[BATCH MANAGER] Loading existing jobs from database...');
        const { jobs, payeeRowDataMap } = await loadAllBatchJobs();
        
        updateJobs(jobs);
        updatePayeeDataMap(payeeRowDataMap);
        setLoaded(true);
        
        console.log(`[BATCH MANAGER] Loaded ${jobs.length} existing jobs`);
      } catch (error) {
        console.error('[BATCH MANAGER] Failed to load existing jobs:', error);
        setLoaded(true);
      }
    };

    loadExistingJobs();
  }, [updateJobs, updatePayeeDataMap, setLoaded]);

  const refreshJobs = async (silent: boolean = true) => {
    try {
      console.log('[BATCH MANAGER] Refreshing jobs from database...');
      const { jobs, payeeRowDataMap } = await loadAllBatchJobs();
      
      updateJobs(jobs);
      updatePayeeDataMap(payeeRowDataMap);
      
      console.log(`[BATCH MANAGER] Refreshed ${jobs.length} jobs`);
    } catch (error) {
      console.error('[BATCH MANAGER] Failed to refresh jobs:', error);
    }
  };

  return { refreshJobs };
};
