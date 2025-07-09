import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to help users recover from stuck or invalid job states
 */
export const useJobRecovery = () => {
  const { toast } = useToast();

  const resyncJobs = useCallback(async () => {
    try {
      console.log('[JOB RECOVERY] Resyncing jobs from database...');
      
      // Force refresh the page to clear all frontend state
      // This is the most reliable way to recover from stuck states
      toast({
        title: "Refreshing Job Data",
        description: "Clearing stuck states and reloading fresh job data...",
        duration: 3000,
      });
      
      // Small delay to show the toast
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('[JOB RECOVERY] Error during resync:', error);
      toast({
        title: "Recovery Failed",
        description: "Could not resync job data. Please refresh the page manually.",
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [toast]);

  const clearLocalStorage = useCallback(() => {
    try {
      console.log('[JOB RECOVERY] Clearing local storage...');
      
      // Clear any cached job data
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.includes('batch') || key.includes('job') || key.includes('polling')
      );
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      toast({
        title: "Cache Cleared",
        description: "Local storage cleared. Refreshing page...",
        duration: 2000,
      });
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('[JOB RECOVERY] Error clearing storage:', error);
      toast({
        title: "Cache Clear Failed",
        description: "Could not clear cache. Please refresh manually.",
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [toast]);

  return {
    resyncJobs,
    clearLocalStorage
  };
};