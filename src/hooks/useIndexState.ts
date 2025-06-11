
import { useState, useEffect } from "react";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { isOpenAIInitialized } from "@/lib/openai/client";
import { logMemoryUsage } from "@/lib/openai/apiUtils";
import { deduplicateClassifications } from "@/lib/resultDeduplication";

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

  // Handle batch completion with proper deduplication
  const handleBatchComplete = (
    results: PayeeClassification[],
    summary: BatchProcessingResult
  ) => {
    try {
      console.log(`[INDEX] Batch complete: ${results.length} results with exact row alignment`);
      
      setBatchResults(results);
      setBatchSummary(summary);
      
      // Combine all results and use proper deduplication
      const combinedResults = [...allResults, ...results];
      console.log(`[INDEX] Before deduplication: ${combinedResults.length} total results`);
      
      // Use the proper deduplication function that checks row indices and content
      const deduplicatedResults = deduplicateClassifications(combinedResults);
      console.log(`[INDEX] After deduplication: ${deduplicatedResults.length} results (removed ${combinedResults.length - deduplicatedResults.length} duplicates)`);
      
      // Only update if there are actual new results after deduplication
      if (deduplicatedResults.length > allResults.length) {
        setAllResults(deduplicatedResults);
        saveResults(deduplicatedResults);
        console.log(`[INDEX] Added ${deduplicatedResults.length - allResults.length} new unique results`);
      } else {
        console.log(`[INDEX] No new unique results to add - all ${results.length} results were duplicates`);
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
