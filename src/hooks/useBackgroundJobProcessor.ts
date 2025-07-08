import { useEffect } from 'react';
import { EnhancedFileGenerationService } from '@/lib/services/enhancedFileGenerationService';
import { logger } from '@/lib/logging/logger';

/**
 * Hook to automatically process existing completed jobs in the background
 */
export const useBackgroundJobProcessor = (enabled: boolean = false) => {
  useEffect(() => {
    if (!enabled) {
      logger.info('Background job processor disabled for stability');
      return;
    }

    // Run background processing once on app load - much longer delay for stability
    const processExistingJobs = async () => {
      try {
        logger.info('Starting background processing of existing completed jobs');
        await EnhancedFileGenerationService.processAllCompletedJobsInBackground();
        logger.info('Background processing completed');
      } catch (error) {
        logger.error('Background processing failed', { error });
      }
    };

    // Much longer delay to let the app fully stabilize (30 seconds)
    const timer = setTimeout(processExistingJobs, 30000);

    return () => clearTimeout(timer);
  }, [enabled]);
};