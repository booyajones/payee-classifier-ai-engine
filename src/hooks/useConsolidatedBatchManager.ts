
import { useCallback } from 'react';
import { BatchJob, createBatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { saveBatchJob } from '@/lib/database/batchJobService';
import { useToast } from '@/components/ui/use-toast';
import { batchProcessingService } from '@/lib/services/batchProcessingService';
import { DEFAULT_CLASSIFICATION_CONFIG } from '@/lib/classification/config';

interface BatchCreationOptions {
  description?: string;
  onJobUpdate?: (job: BatchJob) => void;
  onJobComplete?: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
}

export const useConsolidatedBatchManager = () => {
  const { toast } = useToast();

  const createBatchJob = useCallback(async (
    payeeRowData: PayeeRowData,
    options: BatchCreationOptions = {}
  ): Promise<BatchJob | null> => {
    const { description, onJobUpdate, onJobComplete } = options;
    
    console.log(`[CONSOLIDATED BATCH] Creating batch job for ${payeeRowData.uniquePayeeNames.length} unique payees`);
    
    try {
      // Validate input
      batchProcessingService.validateBatchInput(
        payeeRowData.uniquePayeeNames, 
        payeeRowData.originalFileData
      );

      // For large files (>45k payees), fall back to local processing
      if (payeeRowData.uniquePayeeNames.length > 45000) {
        console.log(`[CONSOLIDATED BATCH] Large file detected, using local processing`);
        
        toast({
          title: "Large File Processing",
          description: "Using enhanced local processing for large file",
        });

        const result = await batchProcessingService.processBatch(
          payeeRowData.uniquePayeeNames,
          {
            ...DEFAULT_CLASSIFICATION_CONFIG,
            offlineMode: true,
            aiThreshold: 75
          },
          payeeRowData.originalFileData
        );

        if (onJobComplete) {
          onJobComplete(result.results, result, 'local-processing');
        }

        return null; // No OpenAI batch job created
      }

      // Create OpenAI batch job for smaller files - pass only the string array
      const job = await createBatchJob(payeeRowData.uniquePayeeNames, description);
      
      // Save to database
      await saveBatchJob(job, payeeRowData);
      
      toast({
        title: "Batch Job Created",
        description: `Job ${job.id.substring(0, 8)}... created successfully`,
      });

      return job;

    } catch (error) {
      console.error('[CONSOLIDATED BATCH] Batch job creation failed:', error);
      
      toast({
        title: "Batch Creation Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
      
      throw error;
    }
  }, [toast]);

  return {
    createBatchJob
  };
};
