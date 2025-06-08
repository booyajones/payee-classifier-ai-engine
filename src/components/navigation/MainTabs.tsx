
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BatchClassificationForm from "@/components/BatchClassificationForm";
import ClassificationResultTable from "@/components/ClassificationResultTable";
import BatchProcessingSummary from "@/components/BatchProcessingSummary";
import KeywordExclusionManager from "@/components/KeywordExclusionManager";
import ClassificationErrorBoundary from "@/components/ClassificationErrorBoundary";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";

interface MainTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  allResults: PayeeClassification[];
  batchResults: PayeeClassification[];
  batchSummary: BatchProcessingResult | null;
  onBatchComplete: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
  onClearAllResults: () => void;
}

const MainTabs = ({
  activeTab,
  onTabChange,
  allResults,
  batchResults,
  batchSummary,
  onBatchComplete,
  onClearAllResults
}: MainTabsProps) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="batch">File Processing</TabsTrigger>
        <TabsTrigger value="keywords">Keyword Management</TabsTrigger>
        <TabsTrigger value="results">All Results ({allResults.length})</TabsTrigger>
      </TabsList>
      
      <TabsContent value="batch" className="mt-6">
        <ClassificationErrorBoundary context="File Processing">
          <BatchClassificationForm onComplete={onBatchComplete} />
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
                  onClick={onClearAllResults}
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
  );
};

export default MainTabs;
