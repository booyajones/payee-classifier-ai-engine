
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
        console.log('[BATCH LOADER] Starting to load existing jobs from database...');
        const { jobs, payeeRowDataMap } = await loadAllBatchJobs();
        
        console.log(`[BATCH LOADER] Successfully loaded ${jobs.length} jobs from database`);
        updateJobs(jobs);
        updatePayeeDataMap(payeeRowDataMap);
        setLoaded(true);
        
      } catch (error) {
        console.error('[BATCH LOADER] Failed to load existing jobs:', error);
        
        // Set loaded to true even on error to prevent infinite loading state
        setLoaded(true);
        
        // Clear any existing data to prevent stale state
        updateJobs([]);
        updatePayeeDataMap({});
        
        // Log additional debug information
        console.error('[BATCH LOADER] Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          name: error instanceof Error ? error.name : 'Unknown',
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    };

    loadExistingJobs();
  }, [updateJobs, updatePayeeDataMap, setLoaded]);

  const refreshJobs = async (silent: boolean = true) => {
    try {
      console.log('[BATCH LOADER] Starting refresh of jobs from database...');
      const { jobs, payeeRowDataMap } = await loadAllBatchJobs();
      
      console.log(`[BATCH LOADER] Successfully refreshed ${jobs.length} jobs`);
      updateJobs(jobs);
      updatePayeeDataMap(payeeRowDataMap);
      
    } catch (error) {
      console.error('[BATCH LOADER] Failed to refresh jobs:', error);
      
      // On refresh failure, don't clear existing data
      // Just log the error and continue with current state
      console.error('[BATCH LOADER] Refresh error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        silent,
        timestamp: new Date().toISOString()
      });
    }
  };

  return { refreshJobs };
};
