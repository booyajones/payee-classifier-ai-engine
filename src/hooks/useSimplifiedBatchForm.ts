
import { useState, useCallback } from 'react';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';

interface BatchFormState {
  activeTab: string;
  batchResults: PayeeClassification[];
  processingSummary: BatchProcessingResult | null;
}

export const useSimplifiedBatchForm = () => {
  const [state, setState] = useState<BatchFormState>({
    activeTab: 'upload',
    batchResults: [],
    processingSummary: null
  });

  const setActiveTab = useCallback((tab: string) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  const setBatchResults = useCallback((results: PayeeClassification[]) => {
    setState(prev => ({ ...prev, batchResults: results }));
  }, []);

  const setProcessingSummary = useCallback((summary: BatchProcessingResult | null) => {
    setState(prev => ({ ...prev, processingSummary: summary }));
  }, []);

  const reset = useCallback(() => {
    setState({
      activeTab: 'upload',
      batchResults: [],
      processingSummary: null
    });
  }, []);

  const handleJobComplete = useCallback((
    results: PayeeClassification[], 
    summary: BatchProcessingResult
  ) => {
    setBatchResults(results);
    setProcessingSummary(summary);
    setActiveTab('results');
  }, [setBatchResults, setProcessingSummary, setActiveTab]);

  return {
    // State
    activeTab: state.activeTab,
    batchResults: state.batchResults,
    processingSummary: state.processingSummary,
    
    // Actions
    setActiveTab,
    setBatchResults,
    setProcessingSummary,
    handleJobComplete,
    reset
  };
};
