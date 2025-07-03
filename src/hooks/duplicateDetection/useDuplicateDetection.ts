import { useState } from 'react';
import { DuplicateDetectionState, DEFAULT_DUPLICATE_DETECTION_CONFIG } from './types';
import { useDuplicateDetectionExecution } from './useDetectionExecution';
import { useDuplicateDetectionConfig } from './useConfigManagement';
import { useDuplicateUserActions } from './useUserActions';

/**
 * Main duplicate detection hook that orchestrates all functionality
 */
export const useDuplicateDetection = () => {
  const [state, setState] = useState<DuplicateDetectionState>({
    isProcessing: false,
    result: null,
    error: null,
    config: DEFAULT_DUPLICATE_DETECTION_CONFIG
  });

  const { runDuplicateDetection } = useDuplicateDetectionExecution(state, setState);
  const { updateConfig, clearResults } = useDuplicateDetectionConfig(setState);
  const { 
    acceptDuplicateGroup,
    rejectDuplicateGroup,
    acceptDuplicateMember,
    rejectDuplicateMember
  } = useDuplicateUserActions(state, setState);

  return {
    ...state,
    runDuplicateDetection,
    updateConfig,
    clearResults,
    acceptDuplicateGroup,
    rejectDuplicateGroup,
    acceptDuplicateMember,
    rejectDuplicateMember
  };
};