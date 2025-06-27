
import { useCallback } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { useBatchJobDownload } from '@/hooks/useBatchJobDownload';
import { useBatchJobRefresh } from '@/hooks/useBatchJobRefresh';
import { useBatchJobCancellation } from '@/hooks/useBatchJobCancellation';
import { saveClassificationResults } from '@/lib/database/classificationService';
import { useToast } from '@/hooks/use-toast';

interface UseBatchJobActionsProps {
  jobs: BatchJob[];
  payeeRowDataMap: Record<string, PayeeRowData>;
  onJobUpdate: (job: BatchJob) => void;
  onJobComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
}

export const useBatchJobActions = ({
  jobs,
  payeeRowDataMap,
  onJobUpdate,
  onJobComplete
}: UseBatchJobActionsProps) => {
  const { toast } = useToast();
  const { downloadResults } = useBatchJobDownload();
  const { refreshJob, refreshingJobs, pollingStates } = useBatchJobRefresh();
  const { cancelJob } = useBatchJobCancellation();

  const handleRefreshJob = useCallback(async (jobId: string) => {
    console.log(`[BATCH JOB ACTIONS] Refreshing job ${jobId}`);
    await refreshJob(jobId, onJobUpdate, async (results, summary, completedJobId) => {
      console.log(`[BATCH JOB ACTIONS] Job ${completedJobId} completed with ${results.length} results`);
      
      // CRITICAL: Save all results to database when job completes
      try {
        console.log(`[BATCH JOB ACTIONS] Saving ${results.length} classification results to database`);
        await saveClassificationResults(results, completedJobId);
        console.log(`[BATCH JOB ACTIONS] Successfully saved results to database for job ${completedJobId}`);
        
        const sicCount = results.filter(r => r.result.sicCode).length;
        const businessCount = results.filter(r => r.result.classification === 'Business').length;
        console.log(`[BATCH JOB ACTIONS] SIC codes saved: ${sicCount} out of ${businessCount} businesses`);
        
        toast({
          title: "Results Saved",
          description: `Saved ${results.length} results to database with ${sicCount} SIC codes`,
        });
      } catch (error) {
        console.error(`[BATCH JOB ACTIONS] ERROR: Failed to save results to database:`, error);
        toast({
          title: "Database Save Error",
          description: `Failed to save results: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive"
        });
      }
      
      // Call the original completion handler
      onJobComplete(results, summary, completedJobId);
    });
  }, [refreshJob, onJobUpdate, onJobComplete, toast]);

  const handleDownloadResults = useCallback(async (job: BatchJob) => {
    const payeeData = payeeRowDataMap[job.id];
    if (!payeeData) {
      console.error(`[BATCH JOB ACTIONS] No payee data for job ${job.id}`);
      return;
    }

    await downloadResults(job, payeeData, async (results, summary, jobId) => {
      console.log(`[BATCH JOB ACTIONS] Download completed for job ${jobId} with ${results.length} results`);
      
      // CRITICAL: Save results to database during download if not already saved
      try {
        console.log(`[BATCH JOB ACTIONS] Ensuring results are saved to database for job ${jobId}`);
        await saveClassificationResults(results, jobId);
        console.log(`[BATCH JOB ACTIONS] Results saved to database for job ${jobId}`);
      } catch (error) {
        console.error(`[BATCH JOB ACTIONS] Warning: Failed to save results during download:`, error);
        // Don't block download for database save failures
      }
      
      onJobComplete(results, summary, jobId);
    });
  }, [downloadResults, payeeRowDataMap, onJobComplete]);

  const handleCancelJob = useCallback(async (jobId: string) => {
    await cancelJob(jobId);
  }, [cancelJob]);

  return {
    refreshingJobs,
    pollingStates,
    handleRefreshJob,
    handleDownloadResults,
    handleCancelJob
  };
};
