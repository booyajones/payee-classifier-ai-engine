// Refactored Keyword Manager using Zustand and consolidated services
import React from 'react';
import { useBatchJobStore } from '@/stores/batchJobStore';
import { useAppStore } from '@/stores/appStore';
import { databaseService } from '@/lib/database/consolidatedDatabaseService';
import { getBuiltInExclusionKeywords, clearCustomKeywordsCache } from '@/lib/classification/keywordExclusion';
import { getAllCustomExclusionKeywords, type ExclusionKeyword } from '@/lib/database/exclusionKeywordService';
import { logger } from '@/lib/logging';

interface KeywordManagerState {
  comprehensiveKeywords: string[];
  customKeywords: ExclusionKeyword[];
  allKeywords: string[];
  editingIndex: number | null;
  editingValue: string;
  loading: boolean;
  saving: boolean;
}

interface KeywordManagerActions {
  loadKeywords: () => Promise<void>;
  addKeyword: (keyword: string) => Promise<void>;
  updateKeyword: (index: number, keyword: string) => Promise<void>;
  deleteKeyword: (index: number) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  setEditing: (index: number | null, value?: string) => void;
}

export const useKeywordManager = (): KeywordManagerState & KeywordManagerActions => {
  const { setError, clearError } = useAppStore();
  const [state, setState] = React.useState<KeywordManagerState>({
    comprehensiveKeywords: [],
    customKeywords: [],
    allKeywords: [],
    editingIndex: null,
    editingValue: '',
    loading: true,
    saving: false
  });

  const showToast = (title: string, description: string, variant?: 'default' | 'destructive') => {
    // Implementation would use toast context or store
    console.log(`Toast: ${title} - ${description}`);
  };

  const loadKeywords = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      logger.debug('Loading keywords from database and built-in sources', null, 'KEYWORD_MANAGER');
      
      // Load built-in keywords
      const comprehensive = getBuiltInExclusionKeywords();
      
      // Load custom keywords from database
      const custom = await getAllCustomExclusionKeywords();
      
      // Combine both lists for display and testing
      const customKeywordStrings = custom.filter(k => k.is_active).map(k => k.keyword);
      const combined = [...comprehensive, ...customKeywordStrings];
      
      setState(prev => ({
        ...prev,
        comprehensiveKeywords: comprehensive,
        customKeywords: custom,
        allKeywords: combined,
        loading: false
      }));
      
      logger.info(`Loaded ${comprehensive.length} comprehensive + ${customKeywordStrings.length} custom = ${combined.length} total keywords`,
        { comprehensive: comprehensive.length, custom: customKeywordStrings.length, total: combined.length },
        'KEYWORD_MANAGER');
    } catch (error) {
      logger.error('Error loading keywords', error, 'KEYWORD_MANAGER');
      setError('Failed to load exclusion keywords');
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const addKeyword = async (keyword: string) => {
    // Check if keyword already exists
    if (state.allKeywords.some(k => k.toLowerCase() === keyword.toLowerCase())) {
      showToast('Duplicate Keyword', 'This keyword already exists', 'destructive');
      return;
    }

    try {
      setState(prev => ({ ...prev, saving: true }));
      
      const result = await databaseService.addKeyword(keyword);
      
      if (result.success) {
        clearCustomKeywordsCache();
        await loadKeywords();
        showToast('Keyword Added', `"${keyword}" has been added to the exclusion list`);
      } else {
        showToast('Failed to Add Keyword', result.error || 'Unknown error occurred', 'destructive');
      }
    } catch (error) {
      logger.error('Error adding keyword', error, 'KEYWORD_MANAGER');
      showToast('Error', 'Failed to add keyword', 'destructive');
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  const updateKeyword = async (index: number, newKeyword: string) => {
    const keywordToEdit = state.allKeywords[index];
    const isComprehensiveKeyword = state.comprehensiveKeywords.includes(keywordToEdit);
    
    if (isComprehensiveKeyword) {
      showToast('Cannot Edit Built-in Keyword', 
        'Built-in keywords cannot be modified. You can add a new custom keyword instead.', 
        'destructive');
      return;
    }

    const customKeyword = state.customKeywords.find(k => k.keyword === keywordToEdit);
    if (!customKeyword) {
      showToast('Keyword Not Found', 'Could not find the keyword to edit', 'destructive');
      return;
    }

    try {
      setState(prev => ({ ...prev, saving: true }));
      
      const result = await databaseService.updateKeyword(customKeyword.id, newKeyword);
      
      if (result.success) {
        clearCustomKeywordsCache();
        await loadKeywords();
        setState(prev => ({ ...prev, editingIndex: null, editingValue: '' }));
        showToast('Keyword Updated', `Keyword has been updated to "${newKeyword}"`);
      } else {
        showToast('Failed to Update Keyword', result.error || 'Unknown error occurred', 'destructive');
      }
    } catch (error) {
      logger.error('Error updating keyword', error, 'KEYWORD_MANAGER');
      showToast('Error', 'Failed to update keyword', 'destructive');
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  const deleteKeyword = async (index: number) => {
    const keywordToDelete = state.allKeywords[index];
    const isComprehensiveKeyword = state.comprehensiveKeywords.includes(keywordToDelete);
    
    if (isComprehensiveKeyword) {
      showToast('Cannot Delete Built-in Keyword', 
        'Built-in keywords cannot be deleted. Only custom keywords can be removed.', 
        'destructive');
      return;
    }

    const customKeyword = state.customKeywords.find(k => k.keyword === keywordToDelete);
    if (!customKeyword) {
      showToast('Keyword Not Found', 'Could not find the keyword to delete', 'destructive');
      return;
    }

    try {
      setState(prev => ({ ...prev, saving: true }));
      
      const result = await databaseService.deleteKeyword(customKeyword.id);
      
      if (result.success) {
        clearCustomKeywordsCache();
        await loadKeywords();
        showToast('Keyword Deleted', `"${keywordToDelete}" has been removed from the exclusion list`);
      } else {
        showToast('Failed to Delete Keyword', result.error || 'Unknown error occurred', 'destructive');
      }
    } catch (error) {
      logger.error('Error deleting keyword', error, 'KEYWORD_MANAGER');
      showToast('Error', 'Failed to delete keyword', 'destructive');
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  const resetToDefaults = async () => {
    try {
      setState(prev => ({ ...prev, saving: true }));
      
      // Delete all custom keywords
      const deletePromises = state.customKeywords.map(keyword => 
        databaseService.deleteKeyword(keyword.id)
      );
      
      await Promise.all(deletePromises);
      
      clearCustomKeywordsCache();
      await loadKeywords();
      
      showToast('Reset Complete', 'All custom keywords have been removed. Only built-in keywords remain.');
    } catch (error) {
      logger.error('Error resetting keywords', error, 'KEYWORD_MANAGER');
      showToast('Error', 'Failed to reset keywords', 'destructive');
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  const setEditing = (index: number | null, value: string = '') => {
    setState(prev => ({
      ...prev,
      editingIndex: index,
      editingValue: index !== null ? state.allKeywords[index] || value : value
    }));
  };

  return {
    ...state,
    loadKeywords,
    addKeyword,
    updateKeyword,
    deleteKeyword,
    resetToDefaults,
    setEditing
  };
};