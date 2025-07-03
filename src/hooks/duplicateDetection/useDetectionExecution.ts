import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { detectDuplicates } from '@/lib/services/duplicate';
import { 
  DuplicateDetectionInput,
  DuplicateDetectionConfig 
} from '@/lib/services/duplicateDetectionTypes';
import { DuplicateDetectionState } from './types';

/**
 * Hook for executing duplicate detection
 */
export const useDuplicateDetectionExecution = (
  state: DuplicateDetectionState,
  setState: React.Dispatch<React.SetStateAction<DuplicateDetectionState>>
) => {
  const { toast } = useToast();

  const runDuplicateDetection = useCallback(async (
    records: DuplicateDetectionInput[],
    config?: Partial<DuplicateDetectionConfig>
  ) => {
    setState(prev => ({
      ...prev,
      isProcessing: true,
      error: null,
      result: null
    }));

    try {
      console.log(`[DUPLICATE DETECTION HOOK] Starting detection for ${records.length} records`);
      
      const detectionConfig = config ? { ...state.config, ...config } : state.config;
      const result = await detectDuplicates(records, detectionConfig);
      
      console.log(`[DUPLICATE DETECTION HOOK] Detection completed:`, result.statistics);
      
      setState(prev => ({
        ...prev,
        isProcessing: false,
        result,
        config: detectionConfig
      }));

      toast({
        title: "Duplicate Detection Complete",
        description: `Found ${result.statistics.duplicates_found} duplicates in ${result.statistics.total_processed} records`,
      });

      return result;

    } catch (error) {
      console.error('[DUPLICATE DETECTION HOOK] Detection failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Duplicate detection failed';
      
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage
      }));

      toast({
        title: "Duplicate Detection Failed",
        description: errorMessage,
        variant: "destructive"
      });

      return null;
    }
  }, [state.config, setState, toast]);

  return { runDuplicateDetection };
};
