import React, { useState } from 'react';
import { useBatchJobStore } from '@/stores/batchJobStore';
import { useToast } from '@/hooks/use-toast';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { checkBatchJobStatus } from '@/lib/openai/trueBatchAPI';
import { getBatchJobResults } from '@/lib/openai/trueBatchAPI';
import { generateDownloadFilename } from '@/lib/utils/batchIdentifierGenerator';
import BatchJobContainer from './BatchJobContainer';

const BatchJobManagerContainer = () => {
  const {
    jobs,
    payeeDataMap,
    processing,
    updateJob,
    removeJob,
    setProcessing,
    clearError
  } = useBatchJobStore();
  
  const { toast } = useToast();
  const [refreshingJobs, setRefreshingJobs] = useState<Set<string>>(new Set());

  const handleRefresh = async (jobId: string) => {
    try {
      setRefreshingJobs(prev => new Set(prev).add(jobId));
      setProcessing(jobId, true);
      clearError(jobId);
      
      const updatedJob = await checkBatchJobStatus(jobId);
      updateJob(updatedJob);
      
      toast({
        title: "Job Status Updated",
        description: `Job ${jobId.slice(0, 8)}... status: ${updatedJob.status}`,
      });
      
    } catch (error) {
      console.error('Failed to refresh job:', error);
      toast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : 'Failed to refresh',
        variant: "destructive"
      });
    } finally {
      setProcessing(jobId, false);
      setRefreshingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  };

  const handleDownload = async (job: BatchJob) => {
    if (job.status !== 'completed') {
      toast({
        title: "Job Not Complete",
        description: "Job must be completed before downloading results",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log(`[DOWNLOAD] Starting enhanced download for job ${job.id}`);
      
      const payeeData = payeeDataMap[job.id];
      if (!payeeData) {
        throw new Error('Payee data not found for this job');
      }

      // Get raw OpenAI results
      const rawResults = await getBatchJobResults(job, payeeData.uniquePayeeNames);
      console.log(`[DOWNLOAD] Retrieved ${rawResults.length} raw results from OpenAI`);
      
      // Process through enhanced pipeline to get properly formatted results
      const { processEnhancedBatchResults } = await import('@/services/batchProcessor/enhancedProcessor');
      const { finalClassifications } = await processEnhancedBatchResults({
        rawResults: rawResults.map(r => ({ result: r })), // Convert to expected format
        uniquePayeeNames: payeeData.uniquePayeeNames,
        payeeData,
        job
      });
      
      console.log(`[DOWNLOAD] Processed ${finalClassifications.length} enhanced results`);
      
      // Map results to original rows with ALL DATA PRESERVATION
      const { mapResultsToOriginalRows } = await import('@/lib/rowMapping/resultMapper');
      const mappedResults = mapResultsToOriginalRows(finalClassifications, payeeData);
      
      console.log(`[DOWNLOAD] Mapped to ${mappedResults.length} complete rows with original data`);
      
      // Create comprehensive CSV with ALL original columns + classification data
      if (mappedResults.length === 0) {
        throw new Error('No results to download');
      }
      
      // Get all column headers (original + new classification columns)
      const allColumns = Object.keys(mappedResults[0]);
      console.log(`[DOWNLOAD] Creating CSV with ${allColumns.length} total columns`);
      
      // Create CSV header
      const csvHeader = allColumns.map(col => `"${col}"`).join(',') + '\n';
      
      // Create CSV rows with ALL data
      const csvRows = mappedResults.map(row => {
        return allColumns.map(col => {
          const value = row[col] || '';
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',');
      }).join('\n');
      
      const csvContent = csvHeader + csvRows;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = generateDownloadFilename('complete_results', job.id, 'csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Complete Results Downloaded",
        description: `Downloaded ${mappedResults.length} rows with ${allColumns.length} columns (original + AI classifications)`,
      });
      
      console.log(`[DOWNLOAD] Successfully downloaded complete results with data integrity preserved`);
      
    } catch (error) {
      console.error('[DOWNLOAD] Failed to download results:', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : 'Failed to download results',
        variant: "destructive"
      });
    }
  };

  const handleCancel = (jobId: string) => {
    // TODO: Implement cancel functionality
    toast({
      title: "Cancel Job",
      description: `Cancel functionality for job ${jobId.slice(0, 8)}... not yet implemented`,
      variant: "destructive"
    });
  };

  const handleJobDelete = async (jobId: string) => {
    try {
      // Delete from database first
      const { BatchJobDatabaseOperations } = await import('@/lib/database/batchJobDatabaseOperations');
      await BatchJobDatabaseOperations.deleteBatchJob(jobId);
      
      // Then remove from store
      removeJob(jobId);
      
      toast({
        title: "Job Deleted",
        description: `Permanently removed job ${jobId.slice(0, 8)}...`,
      });
    } catch (error) {
      console.error('Failed to delete job:', error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : 'Failed to delete job',
        variant: "destructive"
      });
    }
  };

  // Convert processing Set to refreshingJobs Set for compatibility
  const refreshingJobsSet = new Set(Array.from(processing));

  return (
    <BatchJobContainer
      jobs={jobs}
      payeeRowDataMap={payeeDataMap}
      refreshingJobs={refreshingJobsSet}
      pollingStates={{}} // Empty for now, can be enhanced later
      stalledJobActions={{}} // Empty for now, can be enhanced later
      onRefresh={handleRefresh}
      onDownload={handleDownload}
      onCancel={handleCancel}
      onJobDelete={handleJobDelete}
    />
  );
};

export default BatchJobManagerContainer;