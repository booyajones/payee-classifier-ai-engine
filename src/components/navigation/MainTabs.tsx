
import React, { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Upload, Play, TestTube, Users, Eye } from "lucide-react";
import SingleClassificationForm from "@/components/SingleClassificationForm";

import SmartFileUpload from "@/components/SmartFileUpload";
import KeywordExclusionManager from "@/components/KeywordExclusionManager";
import BatchJobManagerContainer from "@/components/batch/BatchJobManagerContainer";


import OptimizedVirtualizedTable from "@/components/table/OptimizedVirtualizedTable";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { useTableSorting } from "@/hooks/useTableSorting";
import { useAppStore } from "@/stores/appStore";
import { useBatchJobStore } from "@/stores/batchJobStore";
import { createBatchJob } from "@/lib/openai/trueBatchAPI";
import { useToast } from "@/hooks/use-toast";
import { useBatchJobPersistence } from "@/hooks/useBatchJobPersistence";

interface MainTabsProps {
  allResults: PayeeClassification[];
  onBatchClassify: (results: PayeeClassification[]) => void;
  onComplete: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
  onJobDelete: () => void;
}

const MainTabs = ({ allResults, onBatchClassify, onComplete, onJobDelete }: MainTabsProps) => {
  console.log('MainTabs rendering, props:', { allResultsLength: allResults.length });
  const { activeTab, setActiveTab } = useAppStore();
  const { addJob, setPayeeData } = useBatchJobStore();
  const { toast } = useToast();
  const { saveBatchJob } = useBatchJobPersistence();
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

  // Handler for batch job creation
  const handleBatchJobCreated = async (batchJob: any, payeeRowData: any) => {
    console.log('Creating new batch job with payee data:', payeeRowData.uniquePayeeNames.length);
    
    try {
      // Create the actual OpenAI batch job
      const { generateContextualBatchJobName } = await import('@/lib/services/batchJobNameGenerator');
      const jobName = generateContextualBatchJobName(payeeRowData.uniquePayeeNames.length, 'file');
      const newBatchJob = await createBatchJob(
        payeeRowData.uniquePayeeNames,
        `Payee classification for ${payeeRowData.uniquePayeeNames.length} payees`,
        jobName
      );
      
      // Add to the batch job store
      addJob(newBatchJob);
      setPayeeData(newBatchJob.id, payeeRowData);
      
      // Save to database
      await saveBatchJob(newBatchJob, payeeRowData);
      
      toast({
        title: "Batch Job Created",
        description: `Created job ${newBatchJob.id.slice(0, 8)}... for ${payeeRowData.uniquePayeeNames.length} payees`,
      });
      
      // Switch to jobs tab
      setActiveTab('jobs');
      
    } catch (error) {
      console.error('Failed to create batch job:', error);
      toast({
        title: "Job Creation Failed",
        description: error instanceof Error ? error.message : 'Failed to create job',
        variant: "destructive"
      });
    }
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
        <TabsTrigger value="jobs" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Jobs
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
          onBatchJobCreated={handleBatchJobCreated}
          onProcessingComplete={(results, summary, jobId) => {
            console.log('Processing complete:', results.length, jobId);
            onComplete(results, summary);
            setActiveTab('jobs');
          }}
        />
      </TabsContent>

      <TabsContent value="jobs" className="mt-6">
        <BatchJobManagerContainer />
      </TabsContent>


      <TabsContent value="keywords" className="mt-6">
        <KeywordExclusionManager />
      </TabsContent>

    </Tabs>
  );
};

export default MainTabs;
