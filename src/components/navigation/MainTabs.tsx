
import React, { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Upload, Play, TestTube, Users, Eye } from "lucide-react";
import SingleClassificationForm from "@/components/SingleClassificationForm";

import SmartFileUpload from "@/components/SmartFileUpload";
import KeywordExclusionManager from "@/components/KeywordExclusionManager";

import OptimizedVirtualizedTable from "@/components/table/OptimizedVirtualizedTable";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { useTableSorting } from "@/hooks/useTableSorting";
import { useAppStore } from "@/stores/appStore";

interface MainTabsProps {
  allResults: PayeeClassification[];
  onBatchClassify: (results: PayeeClassification[]) => void;
  onComplete: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
  onJobDelete: () => void;
}

const MainTabs = ({ allResults, onBatchClassify, onComplete, onJobDelete }: MainTabsProps) => {
  console.log('MainTabs rendering, props:', { allResultsLength: allResults.length });
  const { activeTab, setActiveTab } = useAppStore();
  console.log('MainTabs activeTab:', activeTab);

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
    console.log('Tab changed:', tab);
    setActiveTab(tab);
  };

  // Handler for single classification results
  const handleSingleClassify = (result: PayeeClassification) => {
    console.log('Single classification result:', result.payeeName);
  };

  // Handler for viewing result details
  const handleViewDetails = (result: PayeeClassification) => {
    console.log('View details for payee:', result.payeeName);
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

  console.log('MainTabs about to render tabs with activeTab:', activeTab);
  
  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="single" className="flex items-center gap-2">
          <Play className="h-4 w-4" />
          Single
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
      </TabsList>

      <TabsContent value="single" className="mt-6">
        <SingleClassificationForm onClassify={handleSingleClassify} />
      </TabsContent>


      <TabsContent value="upload" className="mt-6">
        <SmartFileUpload 
          onBatchJobCreated={(batchJob, payeeRowData) => {
            console.log('Batch job created from upload:', batchJob?.id);
            setActiveTab('batch');
          }}
          onProcessingComplete={(results, summary, jobId) => {
            console.log('Processing complete:', results.length, jobId);
            onComplete(results, summary);
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

    </Tabs>
  );
};

export default MainTabs;
