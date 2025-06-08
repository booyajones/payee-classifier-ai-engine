
import { useState, useEffect } from "react";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { isOpenAIInitialized } from "@/lib/openai/client";
import { logMemoryUsage } from "@/lib/openai/apiUtils";

export const useIndexState = () => {
  const [activeTab, setActiveTab] = useState("batch");
  const [batchResults, setBatchResults] = useState<PayeeClassification[]>([]);
  const [batchSummary, setBatchSummary] = useState<BatchProcessingResult | null>(null);
  const [allResults, setAllResults] = useState<PayeeClassification[]>([]);
  const [hasApiKey, setHasApiKey] = useState(false);

  console.log('[INDEX DEBUG] Component rendering, activeTab:', activeTab);

  useEffect(() => {
    try {
      setHasApiKey(isOpenAIInitialized());
      logMemoryUsage('Index component mount');
      
      // Load stored results on component mount
      loadStoredResults();
    } catch (error) {
      console.error('[INDEX ERROR] Initialization failed:', error);
    }
  }, []);

  // Log memory usage on tab changes
  useEffect(() => {
    try {
      logMemoryUsage(`Tab change to ${activeTab}`);
    } catch (error) {
      console.error('[INDEX ERROR] Memory logging failed:', error);
    }
  }, [activeTab]);

  const loadStoredResults = () => {
    try {
      const storedResults = localStorage.getItem('all_classification_results');
      if (storedResults) {
        const parsedResults = JSON.parse(storedResults);
        setAllResults(parsedResults);
        console.log(`[INDEX] Loaded ${parsedResults.length} stored results`);
      }
    } catch (error) {
      console.error('[INDEX ERROR] Error loading stored results:', error);
    }
  };

  const saveResults = (results: PayeeClassification[]) => {
    try {
      localStorage.setItem('all_classification_results', JSON.stringify(results));
      console.log(`[INDEX] Saved ${results.length} results to storage`);
    } catch (error) {
      console.error('[INDEX ERROR] Error saving results:', error);
    }
  };

  // Handle batch completion with proper row mapping
  const handleBatchComplete = (
    results: PayeeClassification[],
    summary: BatchProcessingResult
  ) => {
    try {
      console.log(`[INDEX] Batch complete: ${results.length} results with exact row alignment`);
      
      setBatchResults(results);
      setBatchSummary(summary);
      
      // Remove duplicates before adding to allResults
      const existingIds = new Set(allResults.map(r => r.id));
      const newResults = results.filter(r => !existingIds.has(r.id));
      
      if (newResults.length > 0) {
        const updatedResults = [...allResults, ...newResults];
        setAllResults(updatedResults);
        saveResults(updatedResults);
        console.log(`[INDEX] Added ${newResults.length} new results, ${results.length - newResults.length} duplicates filtered`);
      } else {
        console.log(`[INDEX] All ${results.length} results were duplicates, not adding to storage`);
      }
      
      setActiveTab("results");
      logMemoryUsage('Batch processing complete');
    } catch (error) {
      console.error('[INDEX ERROR] Batch completion failed:', error);
    }
  };

  const handleKeySet = () => {
    try {
      setHasApiKey(true);
    } catch (error) {
      console.error('[INDEX ERROR] Key setting failed:', error);
    }
  };

  const clearAllResults = () => {
    try {
      setAllResults([]);
      setBatchResults([]);
      setBatchSummary(null);
      localStorage.removeItem('all_classification_results');
      console.log('[INDEX] Cleared all stored results');
    } catch (error) {
      console.error('[INDEX ERROR] Clear results failed:', error);
    }
  };

  return {
    activeTab,
    setActiveTab,
    batchResults,
    batchSummary,
    allResults,
    hasApiKey,
    handleBatchComplete,
    handleKeySet,
    clearAllResults
  };
};
