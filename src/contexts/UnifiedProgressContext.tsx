
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface ProgressState {
  stage: string;
  percentage: number;
  message?: string;
  jobId?: string;
}

interface UnifiedProgressContextType {
  getProgress: (id: string) => ProgressState | null;
  updateProgress: (id: string, stage: string, percentage: number, message?: string, jobId?: string) => void;
  completeProgress: (id: string, message?: string) => void;
  clearProgress: (id: string) => void;
  clearAllProgress: () => void;
}

const UnifiedProgressContext = createContext<UnifiedProgressContextType | undefined>(undefined);

export const UnifiedProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [progressMap, setProgressMap] = useState<Record<string, ProgressState>>({});
  const lastUpdateRef = useRef<Record<string, number>>({});
  const timeoutIdsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const updateProgress = useCallback((
    id: string, 
    stage: string, 
    percentage: number, 
    message?: string, 
    jobId?: string
  ) => {
    const now = Date.now();
    const lastUpdate = lastUpdateRef.current[id] || 0;
    
    // Throttle updates to prevent excessive re-renders (max 1 update per 500ms per ID)
    if (now - lastUpdate < 500 && percentage < 100) {
      return;
    }
    
    lastUpdateRef.current[id] = now;
    
    setProgressMap(prev => ({
      ...prev,
      [id]: {
        stage,
        percentage: Math.min(100, Math.max(0, percentage)),
        message,
        jobId
      }
    }));
  }, []);

  const completeProgress = useCallback((id: string, message?: string) => {
    setProgressMap(prev => ({
      ...prev,
      [id]: {
        stage: 'Complete',
        percentage: 100,
        message: message || 'Processing complete',
        jobId: prev[id]?.jobId
      }
    }));
    
    // Auto-clear completed progress after 30 seconds
    if (timeoutIdsRef.current[id]) {
      clearTimeout(timeoutIdsRef.current[id]);
    }
    timeoutIdsRef.current[id] = setTimeout(() => {
      setProgressMap(prev => {
        const newMap = { ...prev };
        delete newMap[id];
        return newMap;
      });
      delete lastUpdateRef.current[id];
      delete timeoutIdsRef.current[id];
    }, 30000);
  }, []);

  const clearProgress = useCallback((id: string) => {
    setProgressMap(prev => {
      const newMap = { ...prev };
      delete newMap[id];
      return newMap;
    });
    delete lastUpdateRef.current[id];
    if (timeoutIdsRef.current[id]) {
      clearTimeout(timeoutIdsRef.current[id]);
      delete timeoutIdsRef.current[id];
    }
  }, []);

  const clearAllProgress = useCallback(() => {
    setProgressMap({});
    lastUpdateRef.current = {};
    Object.values(timeoutIdsRef.current).forEach(clearTimeout);
    timeoutIdsRef.current = {};
  }, []);

  const getProgress = useCallback((id: string) => {
    return progressMap[id] || null;
  }, [progressMap]);

  const value = {
    getProgress,
    updateProgress,
    completeProgress,
    clearProgress,
    clearAllProgress
  };

  useEffect(() => {
    return () => {
      Object.values(timeoutIdsRef.current).forEach(clearTimeout);
      timeoutIdsRef.current = {};
    };
  }, []);

  return (
    <UnifiedProgressContext.Provider value={value}>
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
