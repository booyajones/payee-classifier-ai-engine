
import { useCallback } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { PreGeneratedFileService } from '@/lib/storage/preGeneratedFileService';
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
          uniquePayeeNames: payeeData.uniquePayeeNames
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

      // Generate pre-generated files for future downloads
      const batchResult: BatchProcessingResult = {
        results: finalClassifications,
        successCount: finalClassifications.length,
        failureCount: 0,
        originalFileData: payeeData.originalFileData
      };

      console.log(`[BATCH DOWNLOAD] Generating pre-generated files for future downloads`);
      const fileResult = await PreGeneratedFileService.generateAndStoreFiles(job.id, batchResult);
      
      if (fileResult.error) {
        console.warn('[BATCH DOWNLOAD] File generation failed:', fileResult.error);
      } else {
        console.log(`[BATCH DOWNLOAD] Pre-generated files created successfully`);
      }

      // Complete the job
      onJobComplete(finalClassifications, summary, job.id);

      toast({
        title: "Download Complete",
        description: `Successfully processed ${finalClassifications.length} results. Files are now ready for instant download.`,
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
