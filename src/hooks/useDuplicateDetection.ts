import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { detectDuplicates } from '@/lib/services/smartDuplicateDetectionEngine';
import { 
  DuplicateDetectionResult, 
  DuplicateDetectionInput,
  DuplicateDetectionConfig 
} from '@/lib/services/duplicateDetectionTypes';

export interface DuplicateDetectionState {
  isProcessing: boolean;
  result: DuplicateDetectionResult | null;
  error: string | null;
  config: DuplicateDetectionConfig;
}

export const useDuplicateDetection = () => {
  const [state, setState] = useState<DuplicateDetectionState>({
    isProcessing: false,
    result: null,
    error: null,
    config: {
      highConfidenceThreshold: 95,
      lowConfidenceThreshold: 75,
      enableAiJudgment: true,
      algorithmWeights: {
        jaroWinkler: 0.2,
        tokenSort: 0.4,
        tokenSet: 0.4
      }
    }
  });

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
  }, [state.config, toast]);

  const updateConfig = useCallback((newConfig: Partial<DuplicateDetectionConfig>) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, ...newConfig }
    }));
  }, []);

  const clearResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      result: null,
      error: null
    }));
  }, []);

  const acceptDuplicateGroup = useCallback((groupId: string) => {
    if (!state.result) return;
    
    console.log(`[DUPLICATE DETECTION HOOK] Accepting duplicate group: ${groupId}`);
    
    // Update the result to mark all members in this group as accepted duplicates
    const updatedResult = {
      ...state.result,
      processed_records: state.result.processed_records.map(record => {
        if (record.duplicate_group_id === groupId && record.is_potential_duplicate) {
          return { ...record, user_accepted: true };
        }
        return record;
      })
    };

    setState(prev => ({
      ...prev,
      result: updatedResult
    }));

    toast({
      title: "Duplicate Group Accepted",
      description: "All duplicates in this group have been accepted",
    });
  }, [state.result, toast]);

  const rejectDuplicateGroup = useCallback((groupId: string) => {
    if (!state.result) return;
    
    console.log(`[DUPLICATE DETECTION HOOK] Rejecting duplicate group: ${groupId}`);
    
    // Update the result to mark all members in this group as unique
    const updatedResult = {
      ...state.result,
      processed_records: state.result.processed_records.map(record => {
        if (record.duplicate_group_id === groupId && record.is_potential_duplicate) {
          return { 
            ...record, 
            is_potential_duplicate: false,
            user_rejected: true,
            duplicate_of_payee_id: null
          };
        }
        return record;
      }),
      duplicate_groups: state.result.duplicate_groups.filter(group => group.group_id !== groupId)
    };

    setState(prev => ({
      ...prev,
      result: updatedResult
    }));

    toast({
      title: "Duplicate Group Rejected",
      description: "All records in this group are now marked as unique",
    });
  }, [state.result, toast]);

  const acceptDuplicateMember = useCallback((groupId: string, payeeId: string) => {
    if (!state.result) return;
    
    console.log(`[DUPLICATE DETECTION HOOK] Accepting duplicate member: ${payeeId} in group ${groupId}`);
    
    const updatedResult = {
      ...state.result,
      processed_records: state.result.processed_records.map(record => {
        if (record.payee_id === payeeId && record.duplicate_group_id === groupId) {
          return { ...record, user_accepted: true };
        }
        return record;
      })
    };

    setState(prev => ({
      ...prev,
      result: updatedResult
    }));

    toast({
      title: "Duplicate Accepted",
      description: "Record marked as duplicate",
    });
  }, [state.result, toast]);

  const rejectDuplicateMember = useCallback((groupId: string, payeeId: string) => {
    if (!state.result) return;
    
    console.log(`[DUPLICATE DETECTION HOOK] Rejecting duplicate member: ${payeeId} in group ${groupId}`);
    
    const updatedResult = {
      ...state.result,
      processed_records: state.result.processed_records.map(record => {
        if (record.payee_id === payeeId && record.duplicate_group_id === groupId) {
          return { 
            ...record, 
            is_potential_duplicate: false,
            user_rejected: true,
            duplicate_of_payee_id: null
          };
        }
        return record;
      })
    };

    setState(prev => ({
      ...prev,
      result: updatedResult
    }));

    toast({
      title: "Duplicate Rejected",
      description: "Record marked as unique",
    });
  }, [state.result, toast]);

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