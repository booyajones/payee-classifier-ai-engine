import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Trash2, Download, Play, Pause, X } from 'lucide-react';
import { useBatchJobStore } from '@/stores/batchJobStore';
import { createBatchJob, checkBatchJobStatus, pollBatchJob, getBatchJobResults } from '@/lib/openai/trueBatchAPI';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { useToast } from '@/hooks/use-toast';
import { useBatchJobPersistence } from '@/hooks/useBatchJobPersistence';

const BatchJobManager = () => {
  const {
    jobs,
    payeeDataMap,
    processing,
    errors,
    addJob,
    updateJob,
    removeJob,
    setPayeeData,
    setProcessing,
    setError,
    clearError
  } = useBatchJobStore();
  
  const { toast } = useToast();
  const { saveBatchJob } = useBatchJobPersistence();
  const [pollingJobs, setPollingJobs] = useState<Set<string>>(new Set());

  // Auto-poll jobs that are in progress
  useEffect(() => {
    const pollInProgressJobs = async () => {
      const inProgressJobs = jobs.filter(job => 
        ['validating', 'in_progress', 'finalizing'].includes(job.status) && 
        !pollingJobs.has(job.id)
      );

      for (const job of inProgressJobs) {
        setPollingJobs(prev => new Set(prev).add(job.id));
        
        try {
          await pollBatchJob(job.id, async (updatedJob) => {
            updateJob(updatedJob);
            
            // Save updated status to database
            const payeeData = payeeDataMap[job.id];
            if (payeeData) {
              await saveBatchJob(updatedJob, payeeData);
            }
            
            if (['completed', 'failed', 'expired', 'cancelled'].includes(updatedJob.status)) {
              setPollingJobs(prev => {
                const newSet = new Set(prev);
                newSet.delete(job.id);
                return newSet;
              });
              
              if (updatedJob.status === 'completed') {
                toast({
                  title: "Batch Job Completed",
                  description: `Job ${job.id.slice(0, 8)}... has finished processing`,
                });
              }
            }
          }, 10000); // Poll every 10 seconds
        } catch (error) {
          console.error('Polling failed for job', job.id, error);
          setPollingJobs(prev => {
            const newSet = new Set(prev);
            newSet.delete(job.id);
            return newSet;
          });
        }
      }
    };

    if (jobs.length > 0) {
      pollInProgressJobs();
    }
  }, [jobs, pollingJobs, updateJob, toast]);

  const handleCreateBatchJob = async (payeeData: PayeeRowData) => {
    try {
      setProcessing('creating', true);
      
      const batchJob = await createBatchJob(
        payeeData.uniquePayeeNames,
        `Payee classification for ${payeeData.uniquePayeeNames.length} payees`
      );
      
      addJob(batchJob);
      setPayeeData(batchJob.id, payeeData);
      
      toast({
        title: "Batch Job Created",
        description: `Created job ${batchJob.id.slice(0, 8)}... for ${payeeData.uniquePayeeNames.length} payees`,
      });
      
    } catch (error) {
      console.error('Failed to create batch job:', error);
      setError('creating', error instanceof Error ? error.message : 'Failed to create job');
      toast({
        title: "Job Creation Failed",
        description: error instanceof Error ? error.message : 'Failed to create job',
        variant: "destructive"
      });
    } finally {
      setProcessing('creating', false);
    }
  };

  const handleRefreshJob = async (jobId: string) => {
    try {
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
      setError(jobId, error instanceof Error ? error.message : 'Failed to refresh');
    } finally {
      setProcessing(jobId, false);
    }
  };

  const handleDownloadResults = async (job: BatchJob) => {
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
      link.download = `complete_results_${job.id.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.csv`;
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

  const handleDeleteJob = async (jobId: string) => {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'validating': return 'bg-blue-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'finalizing': return 'bg-orange-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'expired': return 'bg-gray-500';
      case 'cancelled': return 'bg-gray-400';
      default: return 'bg-gray-300';
    }
  };

  const getProgressPercentage = (job: BatchJob) => {
    if (job.request_counts.total === 0) return 0;
    return Math.round((job.request_counts.completed / job.request_counts.total) * 100);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Batch Jobs</h2>
        <div className="text-sm text-muted-foreground">
          {jobs.length} total jobs
        </div>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground mb-4">No batch jobs found.</p>
            <p className="text-sm text-muted-foreground">
              Upload a file in the Upload tab to create your first batch job.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const payeeData = payeeDataMap[job.id];
            const isProcessing = processing.has(job.id);
            const error = errors[job.id];
            const progress = getProgressPercentage(job);
            const isPolling = pollingJobs.has(job.id);

            return (
              <Card key={job.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge 
                        className={`${getStatusColor(job.status)} text-white`}
                        variant="secondary"
                      >
                        {job.status}
                      </Badge>
                      <CardTitle className="text-lg">
                        {job.metadata?.job_name || `Job ${job.id.slice(0, 8)}...`}
                      </CardTitle>
                      {isPolling && (
                        <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRefreshJob(job.id)}
                        disabled={isProcessing}
                      >
                        <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
                      </Button>
                      {job.status === 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadResults(job)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteJob(job.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <p className="text-red-800 text-sm">{error}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Requests</p>
                      <p className="font-medium">{job.request_counts.total}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Completed</p>
                      <p className="font-medium">{job.request_counts.completed}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Failed</p>
                      <p className="font-medium">{job.request_counts.failed}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Progress</p>
                      <p className="font-medium">{progress}%</p>
                    </div>
                  </div>

                  {job.request_counts.total > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Processing Progress</span>
                        <span>{job.request_counts.completed}/{job.request_counts.total}</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  {payeeData && (
                    <div className="bg-muted/50 rounded p-3 text-sm">
                      <p className="text-muted-foreground">
                        <strong>Unique Payees:</strong> {payeeData.uniquePayeeNames.length}
                      </p>
                      <p className="text-muted-foreground">
                        <strong>Total Rows:</strong> {payeeData.originalFileData.length}
                      </p>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(job.created_at * 1000).toLocaleString()}
                    {job.completed_at && (
                      <span className="ml-4">
                        Completed: {new Date(job.completed_at * 1000).toLocaleString()}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BatchJobManager;