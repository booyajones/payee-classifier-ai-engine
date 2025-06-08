
import React, { createContext, useContext, useState, useCallback } from 'react';

interface UnifiedProgressState {
  stage: string;
  percentage: number;
  isActive: boolean;
  message?: string;
  jobId?: string;
}

interface UnifiedProgressContextType {
  progressStates: Record<string, UnifiedProgressState>;
  updateProgress: (id: string, stage: string, percentage: number, message?: string, jobId?: string) => void;
  completeProgress: (id: string, message?: string) => void;
  clearProgress: (id: string) => void;
  getProgress: (id: string) => UnifiedProgressState | null;
}

const UnifiedProgressContext = createContext<UnifiedProgressContextType | undefined>(undefined);

export const UnifiedProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [progressStates, setProgressStates] = useState<Record<string, UnifiedProgressState>>({});

  const updateProgress = useCallback((
    id: string, 
    stage: string, 
    percentage: number, 
    message?: string, 
    jobId?: string
  ) => {
    try {
      console.log(`[UNIFIED PROGRESS] ${id}: ${stage} (${percentage}%) - ${message || ''}`);
      
      // Validate inputs to prevent infinite loops
      if (!id || typeof percentage !== 'number' || !stage) {
        console.error('[UNIFIED PROGRESS ERROR] Invalid inputs:', { id, stage, percentage });
        return;
      }

      // Clamp percentage to prevent invalid values
      const clampedPercentage = Math.max(0, Math.min(100, percentage));
      
      setProgressStates(prev => {
        // Prevent unnecessary updates that could cause re-renders
        const existing = prev[id];
        if (existing && 
            existing.stage === stage && 
            existing.percentage === clampedPercentage && 
            existing.message === message &&
            existing.jobId === jobId) {
          return prev; // No change needed
        }

        return {
          ...prev,
          [id]: {
            stage,
            percentage: clampedPercentage,
            isActive: clampedPercentage < 100,
            message,
            jobId
          }
        };
      });
    } catch (error) {
      console.error('[UNIFIED PROGRESS ERROR] Update failed:', error);
    }
  }, []);

  const completeProgress = useCallback((id: string, message?: string) => {
    try {
      console.log(`[UNIFIED PROGRESS] ${id}: Completed - ${message || ''}`);
      
      if (!id) {
        console.error('[UNIFIED PROGRESS ERROR] Invalid id for completion');
        return;
      }
      
      setProgressStates(prev => ({
        ...prev,
        [id]: {
          stage: 'Completed',
          percentage: 100,
          isActive: false,
          message: message || 'Processing complete',
          jobId: prev[id]?.jobId
        }
      }));
    } catch (error) {
      console.error('[UNIFIED PROGRESS ERROR] Complete failed:', error);
    }
  }, []);

  const clearProgress = useCallback((id: string) => {
    try {
      console.log(`[UNIFIED PROGRESS] ${id}: Cleared`);
      
      if (!id) {
        console.error('[UNIFIED PROGRESS ERROR] Invalid id for clearing');
        return;
      }
      
      setProgressStates(prev => {
        const newStates = { ...prev };
        delete newStates[id];
        return newStates;
      });
    } catch (error) {
      console.error('[UNIFIED PROGRESS ERROR] Clear failed:', error);
    }
  }, []);

  const getProgress = useCallback((id: string): UnifiedProgressState | null => {
    try {
      if (!id) {
        console.error('[UNIFIED PROGRESS ERROR] Invalid id for getting progress');
        return null;
      }
      return progressStates[id] || null;
    } catch (error) {
      console.error('[UNIFIED PROGRESS ERROR] Get failed:', error);
      return null;
    }
  }, [progressStates]);

  return (
    <UnifiedProgressContext.Provider value={{
      progressStates,
      updateProgress,
      completeProgress,
      clearProgress,
      getProgress
    }}>
      {children}
    </UnifiedProgressContext.Provider>
  );
};

export const useUnifiedProgress = () => {
  const context = useContext(UnifiedProgressContext);
  if (context === undefined) {
    throw new Error('useUnifiedProgress must be used within a UnifiedProgressProvider');
  }
  return context;
};
