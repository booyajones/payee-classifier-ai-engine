import { useEffect } from 'react';
import { loadAllBatchJobs } from '@/lib/database/batchJobService';

export const useBatchJobLoader = (
  updateJobs: (jobs: any[]) => void,
  updatePayeeDataMap: (map: Record<string, any>) => void,
  setLoaded: (loaded: boolean) => void
) => {
  useEffect(() => {
    let isMounted = true;
    let loadingInProgress = false;

    const loadExistingJobs = async () => {
      // Prevent multiple simultaneous loads
      if (loadingInProgress) {
        console.log('[BATCH LOADER] Load already in progress, skipping...');
        return;
      }

      loadingInProgress = true;
      
      try {
        console.log('[BATCH LOADER] Starting to load existing jobs from database...');
        
        // Add a small delay to prevent immediate retry loops
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const { jobs, payeeRowDataMap } = await loadAllBatchJobs();
        
        // Only update state if component is still mounted
        if (isMounted) {
          console.log(`[BATCH LOADER] Successfully loaded ${jobs.length} jobs from database`);
          updateJobs(jobs);
          updatePayeeDataMap(payeeRowDataMap);
          setLoaded(true);
        }
        
      } catch (error) {
        console.error('[BATCH LOADER] Failed to load existing jobs:', error);
        
        if (isMounted) {
          // Set loaded to true even on error to prevent infinite loading state
          setLoaded(true);
          
          // Don't clear data on initial load failure - keep any existing state
          // Only clear if this is a fresh load
          if (!loadingInProgress) {
            updateJobs([]);
            updatePayeeDataMap({});
          }
          
          // Log detailed error information
          console.error('[BATCH LOADER] Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            name: error instanceof Error ? error.name : 'Unknown',
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
          });
        }
      } finally {
        loadingInProgress = false;
      }
    };

    loadExistingJobs();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [updateJobs, updatePayeeDataMap, setLoaded]);

  const refreshJobs = async (silent: boolean = true) => {
    try {
      console.log('[BATCH LOADER] Starting refresh of jobs from database...');
      
      // Add exponential backoff for retries
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          const { jobs, payeeRowDataMap } = await loadAllBatchJobs();
          
          console.log(`[BATCH LOADER] Successfully refreshed ${jobs.length} jobs`);
          updateJobs(jobs);
          updatePayeeDataMap(payeeRowDataMap);
          return; // Success, exit retry loop
          
        } catch (error) {
          retries++;
          if (retries >= maxRetries) {
            throw error; // Re-throw if max retries reached
          }
          
          // Exponential backoff: wait 100ms, 200ms, 400ms
          const delay = 100 * Math.pow(2, retries - 1);
          console.log(`[BATCH LOADER] Retry ${retries}/${maxRetries} after ${delay}ms delay`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
    } catch (error) {
      console.error('[BATCH LOADER] Failed to refresh jobs after retries:', error);
      
      // On refresh failure, don't clear existing data
      // Just log the error and continue with current state
      console.error('[BATCH LOADER] Refresh error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        silent,
        timestamp: new Date().toISOString(),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  };

  return { refreshJobs };
};
