
// @ts-nocheck
import React, { createContext, useContext, useState, useCallback } from 'react';

interface ProgressData {
  id: string;
  type: 'upload' | 'download' | 'processing';
  progress: number;
  stage: string;
  processed: number;
  total: number;
  isActive: boolean;
  metadata?: any;
  message?: string;
}

interface UnifiedProgressContextType {
  progressItems: Record<string, ProgressData>;
  startProgress: (id: string, type: 'upload' | 'download' | 'processing', total: number, metadata?: any) => void;
  updateProgress: (id: string, progress: number, stage: string, processed: number) => void;
  completeProgress: (id: string) => void;
  clearProgress: (id: string) => void;
  getActiveProgress: () => ProgressData[];
  getProgress: (id: string) => ProgressData | undefined;
  getProgressById: (id: string) => ProgressData | undefined;
}

const UnifiedProgressContext = createContext<UnifiedProgressContextType | undefined>(undefined);

export const UnifiedProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [progressItems, setProgressItems] = useState<Record<string, ProgressData>>({});

  const startProgress = useCallback((id: string, type: 'upload' | 'download' | 'processing', total: number, metadata?: any) => {
    setProgressItems((prev: any) => ({
      ...prev,
      [id]: {
        id,
        type,
        progress: 0,
        stage: `Starting ${type}...`,
        processed: 0,
        total,
        isActive: true,
        metadata
      }
    }));
  }, []);

  const updateProgress = useCallback((id: string, progress: number, stage: string, processed: number) => {
    setProgressItems((prev: any) => ({
      ...prev,
      [id]: {
        ...prev[id],
        progress,
        stage,
        processed,
        isActive: true
      }
    }));
  }, []);

  const completeProgress = useCallback((id: string) => {
    setProgressItems((prev: any) => {
      const newItems = { ...prev };
      if (newItems[id]) {
        newItems[id] = { ...newItems[id], isActive: false };
      }
      return newItems;
    });
    
    setTimeout(() => {
      setProgressItems((prev: any) => {
        const newItems = { ...prev };
        delete newItems[id];
        return newItems;
      });
    }, 3000);
  }, []);

  const getActiveProgress = useCallback(() => {
    return Object.values(progressItems).filter(item => item.isActive);
  }, [progressItems]);

  const clearProgress = useCallback((id: string) => {
    setProgressItems((prev: any) => {
      const newItems = { ...prev };
      delete newItems[id];
      return newItems;
    });
  }, []);

  const getProgressById = useCallback((id: string) => {
    return progressItems[id];
  }, [progressItems]);

  return (
    <UnifiedProgressContext.Provider value={{
      progressItems,
      startProgress,
      updateProgress,
      completeProgress,
      clearProgress,
      getActiveProgress,
      getProgress: getProgressById,
      getProgressById
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
