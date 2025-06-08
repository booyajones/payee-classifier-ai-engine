import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BatchClassificationForm from "@/components/BatchClassificationForm";
import ClassificationResultTable from "@/components/ClassificationResultTable";
import BatchProcessingSummary from "@/components/BatchProcessingSummary";
import OpenAIKeySetup from "@/components/OpenAIKeySetup";
import KeywordExclusionManager from "@/components/KeywordExclusionManager";
import ErrorBoundary from "@/components/ErrorBoundary";
import ClassificationErrorBoundary from "@/components/ClassificationErrorBoundary";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { PayeeRowData } from "@/lib/rowMapping";
import { isOpenAIInitialized } from "@/lib/openai/client";
import { logMemoryUsage } from "@/lib/openai/apiUtils";

const Index = () => {
  const [activeTab, setActiveTab] = useState("batch");
  const [batchResults, setBatchResults] = useState<PayeeClassification[]>([]);
  const [batchSummary, setBatchSummary] = useState<BatchProcessingResult | null>(null);
  const [allResults, setAllResults] = useState<PayeeClassification[]>([]);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    setHasApiKey(isOpenAIInitialized());
    logMemoryUsage('Index component mount');
    
    // Load stored results on component mount
    loadStoredResults();
  }, []);

  // Log memory usage on tab changes
  useEffect(() => {
    logMemoryUsage(`Tab change to ${activeTab}`);
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
      console.error('[INDEX] Error loading stored results:', error);
    }
  };

  const saveResults = (results: PayeeClassification[]) => {
    try {
      localStorage.setItem('all_classification_results', JSON.stringify(results));
      console.log(`[INDEX] Saved ${results.length} results to storage`);
    } catch (error) {
      console.error('[INDEX] Error saving results:', error);
    }
  };

  // FIXED: Handle batch completion with proper row mapping
  const handleBatchComplete = (
    results: PayeeClassification[],
    summary: BatchProcessingResult
  ) => {
    console.log(`[INDEX] Batch complete: ${results.length} results with exact row alignment`);
    
    setBatchResults(results);
    setBatchSummary(summary);
    
    // Simple append - each result has a unique ID from its job
    const updatedResults = [...allResults, ...results];
    
    setAllResults(updatedResults);
    saveResults(updatedResults);
    
    setActiveTab("results");
    logMemoryUsage('Batch processing complete');
  };

  const handleKeySet = () => {
    setHasApiKey(true);
  };

  const clearAllResults = () => {
    setAllResults([]);
    setBatchResults([]);
    setBatchSummary(null);
    localStorage.removeItem('all_classification_results');
    console.log('[INDEX] Cleared all stored results');
  };

  if (!hasApiKey) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-background">
          <header className="bg-primary text-white py-6 mb-6">
            <div className="container px-4">
              <h1 className="text-2xl font-bold">Payee Classification System</h1>
              <p className="opacity-90">
                Efficient file-based payee classification processing
              </p>
            </div>
          </header>

          <main className="container px-4 pb-8">
            <div className="max-w-2xl mx-auto">
              <OpenAIKeySetup onKeySet={handleKeySet} />
            </div>
          </main>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <header className="bg-primary text-white py-6 mb-6">
          <div className="container px-4">
            <h1 className="text-2xl font-bold">Payee Classification System</h1>
            <p className="opacity-90">
              File-based payee classification processing
            </p>
          </div>
        </header>

        <main className="container px-4 pb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="batch">File Processing</TabsTrigger>
              <TabsTrigger value="keywords">Keyword Management</TabsTrigger>
              <TabsTrigger value="results">All Results ({allResults.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="batch" className="mt-6">
              <ClassificationErrorBoundary context="File Processing">
                <BatchClassificationForm onComplete={handleBatchComplete} />
              </ClassificationErrorBoundary>
            </TabsContent>
            
            <TabsContent value="keywords" className="mt-6">
              <ClassificationErrorBoundary context="Keyword Management">
                <KeywordExclusionManager />
              </ClassificationErrorBoundary>
            </TabsContent>
            
            <TabsContent value="results" className="mt-6">
              <ClassificationErrorBoundary context="Results Display">
                {batchSummary && batchResults.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-4">Latest Batch Summary</h3>
                    <BatchProcessingSummary summary={batchSummary} />
                  </div>
                )}
                
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">All Historical Classification Results</h2>
                    {allResults.length > 0 && (
                      <button
                        onClick={clearAllResults}
                        className="text-sm text-muted-foreground hover:text-destructive"
                      >
                        Clear All Results
                      </button>
                    )}
                  </div>
                  {allResults.length > 0 ? (
                    <ClassificationResultTable results={allResults} />
                  ) : (
                    <div className="text-center py-8 border rounded-md">
                      <p className="text-muted-foreground">
                        No classification results yet. Upload a file to see results here.
                      </p>
                    </div>
                  )}
                </div>
              </ClassificationErrorBoundary>
            </TabsContent>
          </Tabs>
        </main>

        <footer className="bg-muted py-4 text-center text-sm text-muted-foreground">
          <div className="container">
            <p>Payee Classification System &copy; {new Date().getFullYear()}</p>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
};

export default Index;
