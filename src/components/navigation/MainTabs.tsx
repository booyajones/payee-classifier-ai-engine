
import React, { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Upload, Play, TestTube, Users, Eye } from "lucide-react";
import SingleClassificationForm from "@/components/SingleClassificationForm";
import BatchClassificationForm from "@/components/BatchClassificationForm";
import SmartFileUpload from "@/components/SmartFileUpload";
import KeywordExclusionManager from "@/components/KeywordExclusionManager";
import SICCodeTester from "@/components/SICCodeTester";
import OptimizedVirtualizedTable from "@/components/table/OptimizedVirtualizedTable";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { useTableSorting } from "@/hooks/useTableSorting";
import { useAppStore } from "@/stores/appStore";
// import { productionLogger } from "@/lib/logging/productionLogger";

interface MainTabsProps {
  allResults: PayeeClassification[];
  onBatchClassify: (results: PayeeClassification[]) => void;
  onComplete: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
  onJobDelete: () => void;
}

const MainTabs = ({ allResults, onBatchClassify, onComplete, onJobDelete }: MainTabsProps) => {
  const { activeTab, setActiveTab } = useAppStore();

  // Generate original columns from results data - memoized to prevent rerenders
  const getOriginalColumns = useMemo(() => {
    if (allResults.length === 0) {
      return ['payeeName'];
    }
    const firstResult = allResults[0];
    return firstResult.originalData ? Object.keys(firstResult.originalData) : ['payeeName'];
  }, [allResults.length]);

  const {
    sortField,
    sortDirection,
    handleSort,
    sortedResults
  } = useTableSorting(allResults, getOriginalColumns);

  // Handler for tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // productionLogger.info('Tab changed', { tab }, 'MAIN_TABS');
    console.log('Tab changed:', tab);
  };

  // Handler for single classification results
  const handleSingleClassify = (result: PayeeClassification) => {
    // productionLogger.info('Single classification result', { payeeName: result.payeeName }, 'MAIN_TABS');
    console.log('Single classification result:', result.payeeName);
    // Add to results if needed - for now just log
  };

  // Handler for viewing result details
  const handleViewDetails = (result: PayeeClassification) => {
    // productionLogger.info('View details for payee', { payeeName: result.payeeName }, 'MAIN_TABS');
    console.log('View details for payee:', result.payeeName);
    // Could open a modal or navigate to details page
  };

  // Generate columns from results data - memoized to prevent rerenders
  const generateColumns = useMemo(() => {
    if (allResults.length === 0) {
      return [{ key: 'payeeName', label: 'Payee Name', isOriginal: true }];
    }

    // Get original data keys from the first result
    const firstResult = allResults[0];
    const originalColumns = firstResult.originalData 
      ? Object.keys(firstResult.originalData).map(key => ({
          key,
          label: key.charAt(0).toUpperCase() + key.slice(1),
          isOriginal: true
        }))
      : [{ key: 'payeeName', label: 'Payee Name', isOriginal: true }];

    return originalColumns;
  }, [allResults.length]);

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="single" className="flex items-center gap-2">
          <Play className="h-4 w-4" />
          Single
        </TabsTrigger>
        <TabsTrigger value="batch" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Batch
        </TabsTrigger>
        <TabsTrigger value="upload" className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Upload
        </TabsTrigger>
        <TabsTrigger value="results" className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Results
        </TabsTrigger>
        <TabsTrigger value="keywords" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Keywords
        </TabsTrigger>
        <TabsTrigger value="sic-test" className="flex items-center gap-2">
          <TestTube className="h-4 w-4" />
          SIC Test
        </TabsTrigger>
      </TabsList>

      <TabsContent value="single" className="mt-6">
        <SingleClassificationForm onClassify={handleSingleClassify} />
      </TabsContent>

      <TabsContent value="batch" className="mt-6">
        <BatchClassificationForm 
          onBatchClassify={onBatchClassify}
          onComplete={onComplete}
          onJobDelete={onJobDelete}
        />
      </TabsContent>

      <TabsContent value="upload" className="mt-6">
        <SmartFileUpload 
          onBatchJobCreated={(batchJob, payeeRowData) => {
            // productionLogger.info('Batch job created from upload', { jobId: batchJob?.id }, 'MAIN_TABS');
            console.log('Batch job created from upload:', batchJob?.id);
            // Switch to batch tab when job is created
            setActiveTab('batch');
          }}
          onProcessingComplete={(results, summary, jobId) => {
            // productionLogger.info('Processing complete', { resultsCount: results.length, jobId }, 'MAIN_TABS');
            console.log('Processing complete:', results.length, jobId);
            onComplete(results, summary);
            // Switch to results tab when processing is complete
            setActiveTab('results');
          }}
        />
      </TabsContent>

      <TabsContent value="results" className="mt-6">
        <OptimizedVirtualizedTable 
          results={sortedResults}
          columns={generateColumns}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          onViewDetails={handleViewDetails}
        />
      </TabsContent>

      <TabsContent value="keywords" className="mt-6">
        <KeywordExclusionManager />
      </TabsContent>

      <TabsContent value="sic-test" className="mt-6">
        <SICCodeTester />
      </TabsContent>
    </Tabs>
  );
};

export default MainTabs;
