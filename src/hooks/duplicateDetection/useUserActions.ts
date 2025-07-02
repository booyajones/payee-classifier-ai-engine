import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { DuplicateDetectionState } from './types';

/**
 * Hook for handling user interactions with duplicate groups and members
 */
export const useDuplicateUserActions = (
  state: DuplicateDetectionState,
  setState: React.Dispatch<React.SetStateAction<DuplicateDetectionState>>
) => {
  const { toast } = useToast();

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
  }, [state.result, setState, toast]);

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
  }, [state.result, setState, toast]);

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
  }, [state.result, setState, toast]);

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
  }, [state.result, setState, toast]);

  return {
    acceptDuplicateGroup,
    rejectDuplicateGroup,
    acceptDuplicateMember,
    rejectDuplicateMember
  };
};