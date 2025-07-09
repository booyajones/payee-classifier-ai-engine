import { useState, useEffect, useCallback, useMemo } from "react";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { isOpenAIInitialized } from "@/lib/openai/client";
import { logMemoryUsage } from "@/lib/openai/apiUtils";
import { useToast } from "@/components/ui/use-toast";

/**
 * Optimized index state hook with consolidated effects
 * Replaces useIndexState with better performance
 */
export const useOptimizedIndexState = () => {
  const [batchResults, setBatchResults] = useState<PayeeClassification[]>([]);
  const [batchSummary, setBatchSummary] = useState<BatchProcessingResult | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const { toast } = useToast();

  // Single initialization effect
  useEffect(() => {
    const initializeComponent = () => {
      try {
        setHasApiKey(isOpenAIInitialized());
        logMemoryUsage('Index component initialized');
      } catch (error) {
        console.error('[INDEX ERROR] Initialization failed:', error);
        toast({
          title: "Initialization Error",
          description: "Failed to initialize component",
          variant: "destructive",
        });
      }
    };

    initializeComponent();
  }, [toast]);

  // Memoized handlers to prevent unnecessary re-renders
  const handleBatchComplete = useCallback(async (
    results: PayeeClassification[],
    summary: BatchProcessingResult
  ) => {
    try {
      console.log(`[INDEX] Batch complete: ${results.length} results - CSV auto-downloaded`);
      
      setBatchResults(results);
      setBatchSummary(summary);
      
      toast({
        title: "Batch Complete",
        description: `Processed ${results.length} payees. CSV file downloaded automatically.`,
      });
      
      logMemoryUsage('Batch processing complete');
    } catch (error) {
      console.error('[INDEX ERROR] Batch completion failed:', error);
      toast({
        title: "Batch Error",
        description: "Failed to process batch completion",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleJobDelete = useCallback(() => {
    try {
      console.log('[INDEX] Clearing batch summary and results due to job deletion');
      setBatchResults([]);
      setBatchSummary(null);
      
      toast({
        title: "Summary Cleared",
        description: "Batch summary removed with deleted job.",
      });
    } catch (error) {
      console.error('[INDEX ERROR] Failed to clear batch data:', error);
    }
  }, [toast]);

  const handleKeySet = useCallback(() => {
    try {
      setHasApiKey(true);
    } catch (error) {
      console.error('[INDEX ERROR] Key setting failed:', error);
    }
  }, []);

  // Memoized return object
  return useMemo(() => ({
    batchResults,
    batchSummary,
    hasApiKey,
    handleBatchComplete,
    handleJobDelete,
    handleKeySet
  }), [batchResults, batchSummary, hasApiKey, handleBatchComplete, handleJobDelete, handleKeySet]);
};