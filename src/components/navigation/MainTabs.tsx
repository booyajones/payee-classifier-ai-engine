
import React from 'react';
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

interface MainTabsProps {
  allResults: PayeeClassification[];
  onBatchClassify: (results: PayeeClassification[]) => void;
  onComplete: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
  onJobDelete: () => void;
}

const MainTabs = ({ allResults, onBatchClassify, onComplete, onJobDelete }: MainTabsProps) => {
  // Generate original columns from results data
  const getOriginalColumns = () => {
    if (allResults.length === 0) {
      return ['payeeName'];
    }
    const firstResult = allResults[0];
    return firstResult.originalData ? Object.keys(firstResult.originalData) : ['payeeName'];
  };

  const {
    sortField,
    sortDirection,
    handleSort,
    sortedResults
  } = useTableSorting(allResults, getOriginalColumns());

  // Handler for single classification results
  const handleSingleClassify = (result: PayeeClassification) => {
    console.log('[MAIN TABS] Single classification result:', result);
    // Add to results if needed - for now just log
  };

  // Handler for viewing result details
  const handleViewDetails = (result: PayeeClassification) => {
    console.log('[MAIN TABS] View details for:', result);
    // Could open a modal or navigate to details page
  };

  // Generate columns from results data
  const generateColumns = () => {
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
  };

  return (
    <Tabs defaultValue="single" className="w-full">
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
            console.log('[MAIN TABS] Batch job created:', batchJob);
          }}
          onProcessingComplete={(results, summary, jobId) => {
            onComplete(results, summary);
          }}
        />
      </TabsContent>

      <TabsContent value="results" className="mt-6">
        <OptimizedVirtualizedTable 
          results={sortedResults}
          columns={generateColumns()}
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
