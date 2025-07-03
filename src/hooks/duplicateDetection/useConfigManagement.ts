import { useCallback } from 'react';
import { DuplicateDetectionConfig } from '@/lib/services/duplicateDetectionTypes';
import { DuplicateDetectionState } from './types';

/**
 * Hook for managing duplicate detection configuration
 */
export const useDuplicateDetectionConfig = (
  setState: React.Dispatch<React.SetStateAction<DuplicateDetectionState>>
) => {
  const updateConfig = useCallback((newConfig: Partial<DuplicateDetectionConfig>) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, ...newConfig }
    }));
  }, [setState]);

  const clearResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      result: null,
      error: null
    }));
  }, [setState]);

  return {
    updateConfig,
    clearResults
  };
};