
import { useState, useEffect } from "react";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { isOpenAIInitialized } from "@/lib/openai/client";
import { logMemoryUsage } from "@/lib/openai/apiUtils";
import { deduplicateClassifications } from "@/lib/resultDeduplication";
import { 
  loadAllClassificationResults, 
  saveClassificationResults, 
  clearAllClassificationResults
} from "@/lib/database/classificationService";
import { useToast } from "@/components/ui/use-toast";

export const useIndexState = () => {
  const [activeTab, setActiveTab] = useState("batch");
  const [batchResults, setBatchResults] = useState<PayeeClassification[]>([]);
  const [batchSummary, setBatchSummary] = useState<BatchProcessingResult | null>(null);
  const [allResults, setAllResults] = useState<PayeeClassification[]>([]);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const { toast } = useToast();

  console.log('[INDEX DEBUG] Component rendering, activeTab:', activeTab);

  useEffect(() => {
    const initializeComponent = async () => {
      try {
        setHasApiKey(isOpenAIInitialized());
        logMemoryUsage('Index component mount');
        
        // Load stored results from database only
        await loadStoredResults();
      } catch (error) {
        console.error('[INDEX ERROR] Initialization failed:', error);
        toast({
          title: "Initialization Error",
          description: "Failed to load stored results from database",
          variant: "destructive",
        });
      }
    };

    initializeComponent();
  }, []);

  // Log memory usage on tab changes
  useEffect(() => {
    try {
      logMemoryUsage(`Tab change to ${activeTab}`);
    } catch (error) {
      console.error('[INDEX ERROR] Memory logging failed:', error);
    }
  }, [activeTab]);

  const loadStoredResults = async () => {
    try {
      setIsLoadingResults(true);
      
      // Load all results from database only - no localStorage migration
      const storedResults = await loadAllClassificationResults();
      setAllResults(storedResults);
      console.log(`[INDEX] Loaded ${storedResults.length} stored results from database`);
      
    } catch (error) {
      console.error('[INDEX ERROR] Error loading stored results from database:', error);
      toast({
        title: "Database Error",
        description: "Failed to load results from database. Please check your connection.",
        variant: "destructive",
      });
      
      // No localStorage fallback - clean slate
      setAllResults([]);
    } finally {
      setIsLoadingResults(false);
    }
  };

  const saveResults = async (results: PayeeClassification[]) => {
    try {
      await saveClassificationResults(results);
      console.log(`[INDEX] Saved ${results.length} results to database`);
    } catch (error) {
      console.error('[INDEX ERROR] Error saving results to database:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save results to database. Please check your connection.",
        variant: "destructive",
      });
    }
  };

  // Handle batch completion with proper deduplication
  const handleBatchComplete = async (
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
        await saveResults(deduplicatedResults);
        console.log(`[INDEX] Added ${deduplicatedResults.length - allResults.length} new unique results`);
        
        toast({
          title: "Results Saved",
          description: `Added ${deduplicatedResults.length - allResults.length} new unique results to database`,
        });
      } else {
        console.log(`[INDEX] No new unique results to add - all ${results.length} results were duplicates`);
        toast({
          title: "No New Results",
          description: "All results were duplicates and have been filtered out",
        });
      }
      
      setActiveTab("results");
      logMemoryUsage('Batch processing complete');
    } catch (error) {
      console.error('[INDEX ERROR] Batch completion failed:', error);
      toast({
        title: "Batch Error",
        description: "Failed to process batch completion",
        variant: "destructive",
      });
    }
  };

  const handleKeySet = () => {
    try {
      setHasApiKey(true);
    } catch (error) {
      console.error('[INDEX ERROR] Key setting failed:', error);
    }
  };

  const clearAllResults = async () => {
    try {
      // Clear from database only
      await clearAllClassificationResults();
      
      // Clear local state
      setAllResults([]);
      setBatchResults([]);
      setBatchSummary(null);
      
      console.log('[INDEX] Cleared all stored results from database');
      
      toast({
        title: "Results Cleared",
        description: "All stored results have been cleared from the database",
      });
    } catch (error) {
      console.error('[INDEX ERROR] Clear results failed:', error);
      toast({
        title: "Clear Failed",
        description: "Failed to clear results from database",
        variant: "destructive",
      });
    }
  };

  return {
    activeTab,
    setActiveTab,
    batchResults,
    batchSummary,
    allResults,
    hasApiKey,
    isLoadingResults,
    handleBatchComplete,
    handleKeySet,
    clearAllResults
  };
};
