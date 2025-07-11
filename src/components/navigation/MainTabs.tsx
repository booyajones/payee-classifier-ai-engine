
import React, { useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Upload, Play, TestTube, Users, Eye, Activity, BarChart3, Download } from "lucide-react";
import SingleClassificationForm from "@/components/SingleClassificationForm";
import HealthCheckPanel from "@/components/testing/HealthCheckPanel";
import ImplementationSummary from "@/components/testing/ImplementationSummary";
import { EmergencyRecoveryPanel } from "@/components/debug/EmergencyRecoveryPanel";
import BreadcrumbNavigation from "@/components/ui/breadcrumb-navigation";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { useEnhancedNotifications } from "@/components/ui/enhanced-notifications";
import useKeyboardShortcuts from "@/hooks/useKeyboardShortcuts";
import CelebrationAnimation from "@/components/ui/celebration-animation";
import CodeQualityDashboard from "@/components/quality/CodeQualityDashboard";

import SmartFileUpload from "@/components/SmartFileUpload";
import KeywordExclusionManager from "@/components/KeywordExclusionManager";
import BatchJobManagerContainer from "@/components/batch/BatchJobManagerContainer";
import UnifiedDownloadCenter from "@/components/download/UnifiedDownloadCenter";


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

const MainTabs = React.memo(({ allResults, onBatchClassify, onComplete, onJobDelete }: MainTabsProps) => {
  console.log('MainTabs rendering, props:', { allResultsLength: allResults.length });
  const { activeTab, setActiveTab } = useAppStore();
  const { addJob, setPayeeData, jobs, payeeDataMap } = useBatchJobStore();
  const { toast } = useToast();
  const { saveBatchJob } = useBatchJobPersistence();
  const { showSuccess, showError, showInfo } = useEnhancedNotifications();
  const [isTabLoading, setIsTabLoading] = React.useState(false);
  const [showCelebration, setShowCelebration] = React.useState(false);
  console.log('MainTabs activeTab:', activeTab);

  // Setup keyboard shortcuts
  useKeyboardShortcuts();

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

  // Handler for tab changes with loading state - memoized to prevent re-creation
  const handleTabChange = React.useCallback(async (tab: string) => {
    console.log('Tab changed:', tab);
    setIsTabLoading(true);
    
    // Simulate brief loading for smooth UX
    await new Promise(resolve => setTimeout(resolve, 200));
    
    setActiveTab(tab);
    setIsTabLoading(false);
    
    // Show helpful info for new users
    if (tab === 'upload') {
      showInfo(
        "Upload File", 
        "Select a CSV or Excel file with payee names to start batch processing",
        { actionLabel: "Learn More" }
      );
    }
  }, [setActiveTab, showInfo]);

  // Handler for single classification results - memoized
  const handleSingleClassify = React.useCallback((result: PayeeClassification) => {
    console.log('Single classification result:', result.payeeName);
  }, []);

  // Handler for viewing result details - memoized
  const handleViewDetails = React.useCallback((result: PayeeClassification) => {
    console.log('View details for payee:', result.payeeName);
  }, []);

  // Handler for batch job creation - memoized to prevent re-creation
  const handleBatchJobCreated = React.useCallback(async (batchJob: any, payeeRowData: any) => {
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
      
      // Save to database using enhanced operations
      const { EnhancedBatchJobOperations } = await import('@/lib/database/enhancedBatchJobOperations');
      await EnhancedBatchJobOperations.saveBatchJobIntelligently(newBatchJob, payeeRowData);
      
      showSuccess(
        "Batch Job Created Successfully!",
        `Processing ${payeeRowData.uniquePayeeNames.length} payees`,
        {
          action: () => setActiveTab('jobs'),
          actionLabel: "View Jobs"
        }
      );
      
      // Switch to jobs tab
      setActiveTab('jobs');
      
    } catch (error) {
      console.error('Failed to create batch job:', error);
      
      // Check if job was actually created in database despite the error
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: existingJobs } = await supabase
          .from('batch_jobs')
          .select('id, status')
          .order('app_created_at', { ascending: false })
          .limit(1);
        
        if (existingJobs && existingJobs.length > 0) {
          console.log('Job exists in database despite error, showing success');
          showSuccess(
            "Batch Job Created Successfully!",
            `Processing ${payeeRowData.uniquePayeeNames.length} payees`,
            {
              action: () => setActiveTab('jobs'),
              actionLabel: "View Jobs"
            }
          );
          setActiveTab('jobs');
          return;
        }
      } catch (dbError) {
        console.error('Error checking database for existing job:', dbError);
      }
      
      showError(
        "Job Creation Failed",
        error instanceof Error ? error.message : 'Failed to create batch job',
        {
          retry: () => handleBatchJobCreated(batchJob, payeeRowData),
          retryLabel: "Try Again"
        }
      );
    }
  }, [addJob, setPayeeData, saveBatchJob, showSuccess, showError, setActiveTab]);

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

  // Generate breadcrumb items based on active tab - memoized
  const breadcrumbItems = useMemo(() => [
    { 
      label: {
        single: 'Single Classification',
        upload: 'File Upload',
        jobs: 'Batch Jobs',
        downloads: 'Download Center',
        keywords: 'Keyword Management',
        health: 'System Health',
        quality: 'Code Quality'
      }[activeTab] || 'Dashboard',
      active: true
    }
  ], [activeTab]);
  
  return (
    <div className="w-full space-y-4">
      {/* Breadcrumb Navigation */}
      <BreadcrumbNavigation items={breadcrumbItems} />
      
      {/* Celebration Animation */}
      <CelebrationAnimation 
        show={showCelebration}
        title="🎉 Job Completed!"
        description="Your batch processing is complete and ready for download"
        onComplete={() => setShowCelebration(false)}
      />
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-7" role="tablist">
          <TabsTrigger 
            value="single" 
            className="flex items-center gap-2"
            aria-label="Single Classification (Alt+1)"
          >
            <Play className="h-4 w-4" />
            Single
          </TabsTrigger>
          <TabsTrigger 
            value="upload" 
            className="flex items-center gap-2"
            aria-label="File Upload (Alt+2)"
          >
            <Upload className="h-4 w-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger 
            value="jobs" 
            className="flex items-center gap-2"
            aria-label="Batch Jobs (Alt+3)"
          >
            <Users className="h-4 w-4" />
            Jobs
          </TabsTrigger>
          <TabsTrigger 
            value="downloads" 
            className="flex items-center gap-2"
            aria-label="Download Center (Alt+4)"
          >
            <Download className="h-4 w-4" />
            Downloads
          </TabsTrigger>
          <TabsTrigger 
            value="keywords" 
            className="flex items-center gap-2"
            aria-label="Keyword Management (Alt+5)"
          >
            <FileText className="h-4 w-4" />
            Keywords
          </TabsTrigger>
          <TabsTrigger 
            value="health" 
            className="flex items-center gap-2"
            aria-label="System Health (Alt+6)"
          >
            <Activity className="h-4 w-4" />
            Health
          </TabsTrigger>
          <TabsTrigger 
            value="quality" 
            className="flex items-center gap-2"
            aria-label="Code Quality (Alt+7)"
          >
            <BarChart3 className="h-4 w-4" />
            Quality
          </TabsTrigger>
        </TabsList>

        {/* Tab Loading State */}
        {isTabLoading && (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" text="Loading..." />
          </div>
        )}

        {!isTabLoading && (
          <>
            <TabsContent value="single" className="mt-6" role="tabpanel">
              <SingleClassificationForm onClassify={handleSingleClassify} />
            </TabsContent>

            <TabsContent value="upload" className="mt-6" role="tabpanel">
              <SmartFileUpload 
                onBatchJobCreated={handleBatchJobCreated}
                onProcessingComplete={(results, summary, jobId) => {
                  console.log('Processing complete:', results.length, jobId);
                  onComplete(results, summary);
                  setShowCelebration(true);
                  setTimeout(() => setActiveTab('jobs'), 1500);
                }}
              />
            </TabsContent>

            <TabsContent value="jobs" className="mt-6" role="tabpanel">
              <BatchJobManagerContainer />
            </TabsContent>

            <TabsContent value="downloads" className="mt-6" role="tabpanel">
              <UnifiedDownloadCenter 
                jobs={jobs}
                payeeRowDataMap={payeeDataMap}
                onDownload={async (job) => {
                  // Use the existing download handler logic
                  const { useBatchJobDownloadHandler } = await import('@/components/batch/BatchJobDownloadHandler');
                  const { handleDownload } = useBatchJobDownloadHandler({ payeeDataMap });
                  await handleDownload(job);
                }}
                onDelete={async (jobId) => {
                  // Import the job deletion logic
                  const { useBatchJobStore } = await import('@/stores/batchJobStore');
                  const { removeJob } = useBatchJobStore.getState();
                  
                  // Remove from store - this will automatically update the jobs array
                  removeJob(jobId);
                }}
              />
            </TabsContent>

            <TabsContent value="keywords" className="mt-6" role="tabpanel">
              <KeywordExclusionManager />
            </TabsContent>

            <TabsContent value="health" className="mt-6" role="tabpanel">
              <div className="space-y-6">
                <ImplementationSummary />
                <HealthCheckPanel />
                <EmergencyRecoveryPanel />
              </div>
            </TabsContent>

            <TabsContent value="quality" className="mt-6" role="tabpanel">
              <CodeQualityDashboard />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>

  );
});

export default MainTabs;
