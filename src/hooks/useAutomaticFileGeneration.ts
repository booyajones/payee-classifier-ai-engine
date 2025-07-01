
import { useEffect } from 'react';
import { AutomaticFileGenerationService } from '@/lib/services/automaticFileGenerationService';

/**
 * Hook to automatically generate files for completed jobs in the background
 */
export const useAutomaticFileGeneration = (enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled) return;

    const processBackgroundJobs = async () => {
      try {
        await AutomaticFileGenerationService.processAllCompletedJobsWithoutFiles();
      } catch (error) {
        console.error('[AUTO FILE GENERATION] Background processing failed:', error);
      }
    };

    // Run immediately on mount
    processBackgroundJobs();

    // Set up interval to check every 5 minutes
    const interval = setInterval(processBackgroundJobs, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [enabled]);
};
