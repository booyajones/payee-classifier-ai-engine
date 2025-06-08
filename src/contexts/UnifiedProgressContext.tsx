
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
    console.log(`[UNIFIED PROGRESS] ${id}: ${stage} (${percentage}%) - ${message || ''}`);
    
    setProgressStates(prev => ({
      ...prev,
      [id]: {
        stage,
        percentage: Math.max(0, Math.min(100, percentage)),
        isActive: percentage < 100,
        message,
        jobId
      }
    }));
  }, []);

  const completeProgress = useCallback((id: string, message?: string) => {
    console.log(`[UNIFIED PROGRESS] ${id}: Completed - ${message || ''}`);
    
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
  }, []);

  const clearProgress = useCallback((id: string) => {
    console.log(`[UNIFIED PROGRESS] ${id}: Cleared`);
    
    setProgressStates(prev => {
      const newStates = { ...prev };
      delete newStates[id];
      return newStates;
    });
  }, []);

  const getProgress = useCallback((id: string): UnifiedProgressState | null => {
    return progressStates[id] || null;
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
