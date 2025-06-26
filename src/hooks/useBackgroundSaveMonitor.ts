
import { useState, useEffect, useCallback } from 'react';
import { checkBackgroundSaveStatus } from '@/lib/database/batchJobService';
import { useToast } from '@/components/ui/use-toast';

interface BackgroundSaveStatus {
  isComplete: boolean;
  error?: string;
  isMonitoring: boolean;
}

export const useBackgroundSaveMonitor = (jobId?: string) => {
  const [status, setStatus] = useState<BackgroundSaveStatus>({
    isComplete: true,
    isMonitoring: false
  });
  const { toast } = useToast();

  const startMonitoring = useCallback(async (targetJobId: string) => {
    if (!targetJobId) return;
    
    console.log(`[BACKGROUND MONITOR] Starting monitoring for job ${targetJobId}`);
    setStatus(prev => ({ ...prev, isMonitoring: true }));

    // Initial check
    try {
      const result = await checkBackgroundSaveStatus(targetJobId);
      setStatus({
        isComplete: result.isComplete,
        error: result.error,
        isMonitoring: !result.isComplete
      });

      // If not complete, set up polling
      if (!result.isComplete) {
        const pollInterval = setInterval(async () => {
          try {
            const pollResult = await checkBackgroundSaveStatus(targetJobId);
            
            if (pollResult.isComplete) {
              clearInterval(pollInterval);
              setStatus({
                isComplete: true,
                error: pollResult.error,
                isMonitoring: false
              });

              if (pollResult.error) {
                toast({
                  title: "Background Save Error",
                  description: `Job ${targetJobId.slice(-8)} background save failed: ${pollResult.error}`,
                  variant: "destructive"
                });
              } else {
                toast({
                  title: "Background Save Complete",
                  description: `Job ${targetJobId.slice(-8)} data has been fully saved`,
                });
              }
            }
          } catch (error) {
            console.error('[BACKGROUND MONITOR] Polling error:', error);
            clearInterval(pollInterval);
            setStatus(prev => ({ ...prev, isMonitoring: false }));
          }
        }, 10000); // Poll every 10 seconds

        // Clean up after 10 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          setStatus(prev => ({ ...prev, isMonitoring: false }));
        }, 600000);
      }

    } catch (error) {
      console.error('[BACKGROUND MONITOR] Initial check failed:', error);
      setStatus({
        isComplete: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        isMonitoring: false
      });
    }
  }, [toast]);

  const stopMonitoring = useCallback(() => {
    setStatus({
      isComplete: true,
      isMonitoring: false
    });
  }, []);

  // Auto-start monitoring if jobId provided
  useEffect(() => {
    if (jobId) {
      startMonitoring(jobId);
    }
  }, [jobId, startMonitoring]);

  return {
    status,
    startMonitoring,
    stopMonitoring
  };
};
