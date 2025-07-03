
import { useState, useEffect } from "react";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { isOpenAIInitialized } from "@/lib/openai/client";
import { logMemoryUsage } from "@/lib/openai/apiUtils";
import { useToast } from "@/components/ui/use-toast";

export const useIndexState = () => {
  const [batchResults, setBatchResults] = useState<PayeeClassification[]>([]);
  const [batchSummary, setBatchSummary] = useState<BatchProcessingResult | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const { toast } = useToast();

  console.log('[INDEX DEBUG] Component rendering');

  useEffect(() => {
    const initializeComponent = async () => {
      try {
        setHasApiKey(isOpenAIInitialized());
        logMemoryUsage('Index component mount');
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
  }, []);

  // Memory logging on initialization only
  useEffect(() => {
    try {
      logMemoryUsage('Index state initialized');
    } catch (error) {
      console.error('[INDEX ERROR] Memory logging failed:', error);
    }
  }, []);

  // Handle batch completion
  const handleBatchComplete = async (
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
  };

  // Handle job deletion - clear summary and results
  const handleJobDelete = () => {
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
  };

  const handleKeySet = () => {
    try {
      setHasApiKey(true);
    } catch (error) {
      console.error('[INDEX ERROR] Key setting failed:', error);
    }
  };

  return {
    batchResults,
    batchSummary,
    hasApiKey,
    handleBatchComplete,
    handleJobDelete,
    handleKeySet
  };
};
