import { useEffect } from 'react';
import { EnhancedFileGenerationService } from '@/lib/services/enhancedFileGenerationService';
import { logger } from '@/lib/logging/logger';

/**
 * Hook to automatically process existing completed jobs in the background
 */
export const useBackgroundJobProcessor = () => {
  useEffect(() => {
    // Run background processing once on app load
    const processExistingJobs = async () => {
      try {
        logger.info('Starting background processing of existing completed jobs');
        await EnhancedFileGenerationService.processAllCompletedJobsInBackground();
        logger.info('Background processing completed');
      } catch (error) {
        logger.error('Background processing failed', { error });
      }
    };

    // Delay to let the app fully load first
    const timer = setTimeout(processExistingJobs, 2000);

    return () => clearTimeout(timer);
  }, []);
};