
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BatchClassificationForm from "@/components/BatchClassificationForm";
import BatchProcessingSummary from "@/components/BatchProcessingSummary";
import KeywordExclusionManager from "@/components/KeywordExclusionManager";
import ClassificationErrorBoundary from "@/components/ClassificationErrorBoundary";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";

interface MainTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  batchResults: PayeeClassification[];
  batchSummary: BatchProcessingResult | null;
  onBatchComplete: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
  onJobDelete: () => void;
}

const MainTabs = ({
  activeTab,
  onTabChange,
  batchResults,
  batchSummary,
  onBatchComplete,
  onJobDelete
}: MainTabsProps) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="batch">File Processing</TabsTrigger>
        <TabsTrigger value="keywords">Keyword Management</TabsTrigger>
      </TabsList>
      
      <TabsContent value="batch" className="mt-6">
        <ClassificationErrorBoundary context="File Processing">
          <BatchClassificationForm 
            onComplete={onBatchComplete} 
            onJobDelete={onJobDelete}
          />
          
          {batchSummary && batchResults.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Latest Batch Summary</h3>
              <BatchProcessingSummary summary={batchSummary} />
            </div>
          )}
        </ClassificationErrorBoundary>
      </TabsContent>
      
      <TabsContent value="keywords" className="mt-6">
        <ClassificationErrorBoundary context="Keyword Management">
          <KeywordExclusionManager />
        </ClassificationErrorBoundary>
      </TabsContent>
    </Tabs>
  );
};

export default MainTabs;
