import React, { useState, useCallback } from 'react';
import { useBatchJobStore } from '@/stores/batchJobStore';
import { useToast } from '@/hooks/use-toast';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { checkBatchJobStatus } from '@/lib/openai/trueBatchAPI';
import { getBatchJobResults } from '@/lib/openai/trueBatchAPI';
import { generateDownloadFilename } from '@/lib/utils/batchIdentifierGenerator';
import { useBatchJobRealtime } from '@/hooks/useBatchJobRealtime';
import { useBatchJobActions } from './useBatchJobActions';
import { useBatchJobAutoPolling } from './BatchJobAutoPolling';
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
  const [autoPollingJobs, setAutoPollingJobs] = useState<Set<string>>(new Set());

  // Handle real-time job updates from Supabase
  const handleRealtimeJobUpdate = useCallback((updatedJob: BatchJob) => {
    console.log('[REALTIME] Received job update:', updatedJob.id.substring(0, 8), 'status:', updatedJob.status);
    updateJob(updatedJob);
    
    // Show toast notification for significant status changes
    // Only show toasts for valid OpenAI batch job IDs (length > 20 and starts with "batch_")
    if (['completed', 'failed', 'expired', 'cancelled'].includes(updatedJob.status) && 
        updatedJob.id.startsWith('batch_') && 
        updatedJob.id.length > 20) {
      toast({
        title: "Job Status Updated",
        description: `Job ${updatedJob.id.slice(0, 8)}... is now ${updatedJob.status}`,
        variant: updatedJob.status === 'completed' ? 'default' : 'destructive'
      });
    }
  }, [updateJob, toast]);

  // Enable real-time updates
  useBatchJobRealtime(handleRealtimeJobUpdate);

  // Use the comprehensive batch job actions system
  const {
    refreshingJobs,
    pollingStates,
    handleRefreshJob,
    handleDownloadResults,
    handleCancelJob,
    getStalledJobActions,
    detectStalledJob
  } = useBatchJobActions({
    jobs,
    payeeRowDataMap: payeeDataMap,
    onJobUpdate: updateJob,
    onJobComplete: () => {} // Handle job completion if needed
  });

  // Initialize auto-polling for active jobs
  useBatchJobAutoPolling({
    jobs,
    autoPollingJobs,
    setAutoPollingJobs,
    handleRefreshJob
  });

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

  // Generate stalled job actions for all jobs
  const stalledJobActions = jobs.reduce((acc, job) => {
    const stalledAction = getStalledJobActions(job);
    if (stalledAction) {
      acc[job.id] = stalledAction;
    }
    return acc;
  }, {} as Record<string, any>);

  return (
    <BatchJobContainer
      jobs={jobs}
      payeeRowDataMap={payeeDataMap}
      refreshingJobs={refreshingJobs}
      pollingStates={pollingStates}
      stalledJobActions={stalledJobActions}
      onRefresh={handleRefreshJob}
      onDownload={handleDownloadResults}
      onCancel={handleCancelJob}
      onJobDelete={handleJobDelete}
    />
  );
};

export default BatchJobManagerContainer;