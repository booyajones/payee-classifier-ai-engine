
import { useState, useCallback } from 'react';

interface ProgressState {
  stage: string;
  percentage: number;
  isActive: boolean;
  message?: string;
}

export const useProgressTracking = () => {
  const [progressStates, setProgressStates] = useState<Record<string, ProgressState>>({});

  const updateProgress = useCallback((id: string, stage: string, percentage: number, message?: string) => {
    setProgressStates(prev => ({
      ...prev,
      [id]: {
        stage,
        percentage: Math.max(0, Math.min(100, percentage)),
        isActive: percentage < 100,
        message
      }
    }));
  }, []);

  const completeProgress = useCallback((id: string, message?: string) => {
    setProgressStates(prev => ({
      ...prev,
      [id]: {
        stage: 'Completed',
        percentage: 100,
        isActive: false,
        message: message || 'Processing complete'
      }
    }));
  }, []);

  const clearProgress = useCallback((id: string) => {
    setProgressStates(prev => {
      const newStates = { ...prev };
      delete newStates[id];
      return newStates;
    });
  }, []);

  const getProgress = useCallback((id: string): ProgressState | null => {
    return progressStates[id] || null;
  }, [progressStates]);

  return {
    updateProgress,
    completeProgress,
    clearProgress,
    getProgress
  };
};
