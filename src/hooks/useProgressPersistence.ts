// @ts-nocheck
import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ProgressState {
  id: string;
  percentage: number;
  stage: string;
  message: string;
  timestamp: number;
  jobId?: string;
  status?: string;
  metadata?: Record<string, any>;
  memoryUsage?: number;
  estimatedTimeRemaining?: number;
}

interface ProgressHistory {
  [key: string]: ProgressState[];
}

const STORAGE_KEY = 'lovable_progress_state';
const MAX_HISTORY_PER_ID = 50;
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

export const useProgressPersistence = () => {
  const [progressStates, setProgressStates] = useState<Record<string, ProgressState>>({});
  const [progressHistory, setProgressHistory] = useState<ProgressHistory>({});
  const { toast } = useToast();

  // Load persisted progress on mount
  useEffect(() => {
    loadPersistedProgress();
    
    // Set up periodic cleanup
    const cleanupInterval = setInterval(cleanupOldProgress, CLEANUP_INTERVAL);
    return () => clearInterval(cleanupInterval);
  }, []);

  const loadPersistedProgress = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        setProgressStates(data.current || {});
        setProgressHistory(data.history || {});
        
        productionLogger.debug('[PROGRESS PERSISTENCE] Loaded persisted progress:', Object.keys(data.current || {}));
        
        // Check for any incomplete operations that need recovery
        const incompleteOperations = Object.values(data.current || {}).filter(
          (state: any) => state.percentage < 100 && state.percentage > 0
        );
        
        if (incompleteOperations.length > 0) {
          toast({
            title: "Previous Operations Recovered",
            description: `Found ${incompleteOperations.length} incomplete operation(s) from previous session.`,
          });
        }
      }
    } catch (error) {
      productionLogger.warn('[PROGRESS PERSISTENCE] Failed to load persisted progress:', error);
    }
  }, [toast]);

  const persistProgress = useCallback((current: Record<string, ProgressState>, history: ProgressHistory) => {
    try {
      const data = { current, history, timestamp: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      productionLogger.warn('[PROGRESS PERSISTENCE] Failed to persist progress:', error);
      
      // If storage is full, try to clean up and retry
      cleanupOldProgress();
      try {
        const data = { current, history, timestamp: Date.now() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (retryError) {
        toast({
          title: "Storage Warning",
          description: "Unable to save progress. Your browser storage may be full.",
          variant: "destructive",
        });
      }
    }
  }, [toast]);

  const updateProgress = useCallback((
    id: string,
    message: string,
    percentage: number = 0,
    stage: string = 'Processing',
    jobId?: string,
    metadata?: Record<string, any>
  ) => {
    const memoryInfo = (performance as any).memory;
    const memoryUsage = memoryInfo ? memoryInfo.usedJSHeapSize : undefined;
    
    // Enhanced time estimation based on progress rate
    const existingProgress = progressStates[id];
    let estimatedTimeRemaining: number | undefined;
    
    if (existingProgress && percentage > existingProgress.percentage && percentage < 100) {
      const progressDiff = percentage - existingProgress.percentage;
      const timeDiff = Date.now() - existingProgress.timestamp;
      const remainingProgress = 100 - percentage;
      estimatedTimeRemaining = Math.round((remainingProgress / progressDiff) * timeDiff);
    }

    const newState: ProgressState = {
      id,
      percentage: Math.max(0, Math.min(100, percentage)),
      stage,
      message,
      timestamp: Date.now(),
      jobId,
      metadata,
      memoryUsage,
      estimatedTimeRemaining
    };

    setProgressStates(prev => {
      const updated = { ...prev, [id]: newState };
      
      // Update history
      setProgressHistory(prevHistory => {
        const updatedHistory = { ...prevHistory };
        if (!updatedHistory[id]) {
          updatedHistory[id] = [];
        }
        
        // Add to history, keeping only recent entries
        updatedHistory[id] = [
          ...updatedHistory[id].slice(-MAX_HISTORY_PER_ID + 1),
          newState
        ];
        
        // Persist both current state and history
        persistProgress(updated, updatedHistory);
        
        return updatedHistory;
      });
      
      return updated;
    });

    productionLogger.debug(`[PROGRESS PERSISTENCE] Updated progress for ${id}: ${percentage}% - ${message}${estimatedTimeRemaining ? ` (ETA: ${Math.round(estimatedTimeRemaining / 1000)}s)` : ''}`);
  }, [persistProgress, progressStates]);

  const completeProgress = useCallback((id: string, finalMessage: string = 'Completed') => {
    updateProgress(id, finalMessage, 100, 'Complete');
    
    // Keep completed progress for a short time before cleanup
    setTimeout(() => {
      setProgressStates(prev => {
        const updated = { ...prev };
        delete updated[id];
        
        setProgressHistory(prevHistory => {
          persistProgress(updated, prevHistory);
          return prevHistory;
        });
        
        return updated;
      });
    }, 30000); // Keep for 30 seconds
  }, [updateProgress]);

  const clearProgress = useCallback((id: string) => {
    setProgressStates(prev => {
      const updated = { ...prev };
      delete updated[id];
      
      setProgressHistory(prevHistory => {
        const updatedHistory = { ...prevHistory };
        delete updatedHistory[id];
        persistProgress(updated, updatedHistory);
        return updatedHistory;
      });
      
      return updated;
    });
    
    productionLogger.debug(`[PROGRESS PERSISTENCE] Cleared progress for ${id}`);
  }, [persistProgress]);

  const getProgress = useCallback((id: string): ProgressState | null => {
    return progressStates[id] || null;
  }, [progressStates]);

  const getProgressHistory = useCallback((id: string): ProgressState[] => {
    return progressHistory[id] || [];
  }, [progressHistory]);

  const getAllActiveProgress = useCallback((): ProgressState[] => {
    return Object.values(progressStates).filter(state => state.percentage < 100);
  }, [progressStates]);

  const cleanupOldProgress = useCallback(() => {
    const cutoffTime = Date.now() - CLEANUP_INTERVAL;
    
    setProgressStates(prev => {
      const updated = { ...prev };
      let hasChanges = false;
      
      Object.keys(updated).forEach(id => {
        if (updated[id].timestamp < cutoffTime && updated[id].percentage === 100) {
          delete updated[id];
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        setProgressHistory(prevHistory => {
          const updatedHistory = { ...prevHistory };
          
          // Clean up old history entries
          Object.keys(updatedHistory).forEach(id => {
            updatedHistory[id] = updatedHistory[id].filter(
              state => state.timestamp > cutoffTime
            );
            
            if (updatedHistory[id].length === 0) {
              delete updatedHistory[id];
            }
          });
          
          persistProgress(updated, updatedHistory);
          return updatedHistory;
        });
        
        productionLogger.debug('[PROGRESS PERSISTENCE] Cleaned up old progress data');
      }
      
      return updated;
    });
  }, [persistProgress]);

  const exportProgress = useCallback(() => {
    const exportData = {
      current: progressStates,
      history: progressHistory,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progress-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [progressStates, progressHistory]);

  return {
    updateProgress,
    completeProgress,
    clearProgress,
    getProgress,
    getProgressHistory,
    getAllActiveProgress,
    cleanupOldProgress,
    exportProgress,
    progressStates,
    progressHistory
  };
};
