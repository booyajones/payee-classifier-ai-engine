
import { useCallback } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { EnhancedFileGenerationService } from '@/lib/services/enhancedFileGenerationService';
import { processDownloadResults, saveProcessedResults } from '@/hooks/batch/downloadProcessor';
import { useToast } from '@/hooks/use-toast';

interface UseBatchJobDownloadProps {
  payeeRowDataMap: Record<string, PayeeRowData>;
  onJobComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
}

export const useBatchJobDownload = ({
  payeeRowDataMap,
  onJobComplete
}: UseBatchJobDownloadProps) => {
  const { toast } = useToast();

  const handleDownloadResults = useCallback(async (job: BatchJob) => {
    const payeeData = payeeRowDataMap[job.id];
    if (!payeeData) {
      console.error(`[BATCH DOWNLOAD] No payee data found for job ${job.id}`);
      return;
    }

    try {
      console.log(`[BATCH DOWNLOAD] Starting download for job ${job.id}`);

      const { finalClassifications, summary } = await processDownloadResults(
        {
          job,
          payeeData,
          uniquePayeeNames: payeeData.uniquePayeeNames,
          onJobComplete
        },
        (processed, total, percentage) => {
          console.log(`[BATCH DOWNLOAD] Progress: ${processed}/${total} (${percentage}%)`);
        }
      );

      // Save results to database
      const saveResult = await saveProcessedResults(finalClassifications, job.id);
      
      if (!saveResult.success) {
        console.error('[BATCH DOWNLOAD] Database save failed:', saveResult.error);
        toast({
          title: "Warning",
          description: saveResult.error || "Database save failed",
          variant: "destructive",
        });
      }

      // Enhanced automatic file generation for instant future downloads
      console.log(`[BATCH DOWNLOAD] Triggering enhanced file generation for job ${job.id}`);
      const fileGenResult = await EnhancedFileGenerationService.processCompletedJob(job);
      
      if (fileGenResult.success) {
        console.log(`[BATCH DOWNLOAD] Files generated successfully for job ${job.id}`);
      } else {
        console.warn(`[BATCH DOWNLOAD] File generation failed for job ${job.id}:`, fileGenResult.error);
      }

      // Complete the job
      onJobComplete(finalClassifications, summary, job.id);

      toast({
        title: "Download Complete",
        description: `Successfully processed ${finalClassifications.length} results. Files are ready for instant download.`,
      });

    } catch (error) {
      console.error('[BATCH DOWNLOAD] Download failed:', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  }, [payeeRowDataMap, onJobComplete, toast]);

  return {
    handleDownloadResults
  };
};
