import { useCallback } from 'react';
import { useBatchJobStore } from '@/stores/batchJobStore';
import { cancelBatchJob } from '@/lib/openai/trueBatchAPI';
import { useToast } from '@/hooks/use-toast';
import { emergencyStop } from '@/lib/performance/emergencyStop';

export const useEmergencyKillSwitch = () => {
  const { jobs, clearAllJobs, setProcessing } = useBatchJobStore();
  const { toast } = useToast();

  const emergencyKillAll = useCallback(async () => {
    console.log('[EMERGENCY KILL] Activating emergency kill switch for all jobs');
    
    // Activate emergency stop immediately
    emergencyStop.activate('Emergency kill switch activated');
    
    // Show immediate feedback
    toast({
      title: "🛑 Emergency Kill Activated",
      description: "Stopping all jobs and clearing system state...",
      variant: "destructive",
      duration: 10000
    });

    try {
      // Get all active jobs
      const activeJobs = jobs.filter(job => 
        ['validating', 'in_progress', 'finalizing'].includes(job.status)
      );

      console.log(`[EMERGENCY KILL] Found ${activeJobs.length} active jobs to cancel`);

      // Cancel all active jobs in parallel
      const cancelPromises = activeJobs.map(async (job) => {
        try {
          console.log(`[EMERGENCY KILL] Cancelling job ${job.id.substring(0, 8)}`);
          await cancelBatchJob(job.id);
          setProcessing(job.id, false);
          return { id: job.id, success: true };
        } catch (error) {
          console.error(`[EMERGENCY KILL] Error cancelling job ${job.id.substring(0, 8)}:`, error);
          setProcessing(job.id, false);
          return { id: job.id, success: false, error };
        }
      });

      // Wait for all cancellations (with timeout)
      const results = await Promise.allSettled(cancelPromises);
      
      // Clear all jobs from state regardless of cancellation results
      clearAllJobs();

      // Clear any pending timeouts/intervals (simplified approach)
      try {
        // Clear a reasonable range of potential timeout IDs
        for (let i = 1; i <= 10000; i++) {
          clearTimeout(i);
          clearInterval(i);
        }
      } catch (e) {
        // Ignore errors from clearing non-existent timeouts
      }

      // Force garbage collection if available
      if (typeof window !== 'undefined' && (window as any).gc) {
        try {
          (window as any).gc();
        } catch (e) {
          // Ignore GC errors
        }
      }

      // Count successful cancellations
      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      console.log(`[EMERGENCY KILL] Completed: ${successful}/${activeJobs.length} jobs cancelled`);
      
      toast({
        title: "✅ Emergency Kill Complete",
        description: `Cancelled ${successful}/${activeJobs.length} active jobs. All state cleared.`,
        variant: "default",
        duration: 5000
      });

      // Deactivate emergency stop after cleanup
      setTimeout(() => {
        emergencyStop.deactivate('Emergency kill cleanup completed');
      }, 2000);

    } catch (error) {
      console.error('[EMERGENCY KILL] Critical error during emergency kill:', error);
      
      // Force clear everything anyway
      clearAllJobs();
      
      toast({
        title: "⚠️ Emergency Kill Forced",
        description: "Forced system reset due to errors. Page may need refresh.",
        variant: "destructive",
        duration: 10000
      });
    }
  }, [jobs, clearAllJobs, setProcessing, toast]);

  const quickReset = useCallback(() => {
    console.log('[EMERGENCY KILL] Quick reset - clearing all state');
    
    // Immediate emergency stop
    emergencyStop.activate('Quick reset activated');
    
    // Clear all jobs immediately
    clearAllJobs();
    
    // Clear all processing states
    jobs.forEach(job => setProcessing(job.id, false));
    
    toast({
      title: "🔄 Quick Reset Complete",
      description: "All jobs cleared from interface. System reset.",
      variant: "default"
    });

    // Deactivate after short delay
    setTimeout(() => {
      emergencyStop.deactivate('Quick reset completed');
    }, 1000);
  }, [jobs, clearAllJobs, setProcessing, toast]);

  return {
    emergencyKillAll,
    quickReset,
    isEmergencyActive: emergencyStop.check()
  };
};