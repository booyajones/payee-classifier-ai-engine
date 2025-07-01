import { useCallback, useRef } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { createBatchJob } from '@/lib/openai/trueBatchAPI';
import { saveBatchJob } from '@/lib/database/batchJobService';
import { useToast } from '@/hooks/use-toast';
import { handleError, showErrorToast, ERROR_CODES, BatchProcessingError } from '@/lib/errorHandler';
import { detectOpenAIError } from './useBatchJobErrorDetection';
import { emitBatchJobUpdate } from './useBatchJobEventEmitter';

interface BatchCreationOptions {
  description?: string;
  onJobUpdate?: (job: BatchJob) => void;
  onJobComplete?: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
  silent?: boolean;
}

export const useBatchJobCreation = (
  addJob: (job: BatchJob, payeeData: PayeeRowData) => void,
  setError: (key: string, error: string) => void,
  clearError: (key: string) => void
) => {
  const { toast } = useToast();
  const jobCreationInProgress = useRef<Set<string>>(new Set());

  const createBatch = useCallback(async (
    payeeRowData: PayeeRowData,
    options: BatchCreationOptions = {}
  ): Promise<BatchJob | null> => {
    const jobKey = `${Date.now()}-${Math.random()}`;
    
    if (jobCreationInProgress.current.has(jobKey)) {
      console.log('[BATCH CREATION] Job creation already in progress for this request');
      return null;
    }

    jobCreationInProgress.current.add(jobKey);

    try {
      console.log(`[BATCH CREATION] Creating batch job for ${payeeRowData.uniquePayeeNames.length} payees`);
      
      // Validate input data
      if (!payeeRowData.uniquePayeeNames || payeeRowData.uniquePayeeNames.length === 0) {
        throw new BatchProcessingError(
          ERROR_CODES.NO_VALID_PAYEES,
          'No valid payee names found in the uploaded file'
        );
      }

      if (payeeRowData.uniquePayeeNames.length > 50000) {
        toast({
          title: "Large File Detected",
          description: `Processing ${payeeRowData.uniquePayeeNames.length} payees. This may take several minutes.`,
        });
      }

      // Clear any previous errors
      clearError('create');

      // Create the OpenAI batch job
      console.log('[BATCH CREATION] Calling OpenAI API to create batch job...');
      const job = await createBatchJob(
        payeeRowData.uniquePayeeNames, 
        options.description || 'Batch Classification Job'
      );
      
      if (!job) {
        throw new BatchProcessingError(
          ERROR_CODES.BATCH_CREATION_FAILED,
          'Failed to create batch job - no job returned from OpenAI API'
        );
      }

      console.log(`[BATCH CREATION] OpenAI batch job created successfully: ${job.id}`);

      // Add to local state immediately for responsive UI
      addJob(job, payeeRowData);

      // Attempt to save to database (non-blocking for user experience)
      try {
        console.log(`[BATCH CREATION] Saving job ${job.id} to database...`);
        await saveBatchJob(job, payeeRowData);
        
        console.log(`[BATCH CREATION] Job ${job.id} saved to database successfully`);
        toast({
          title: "Batch Job Created",
          description: `Job ${job.id.substring(0, 8)}... created and saved successfully`,
        });

      } catch (dbError) {
        console.error(`[BATCH CREATION] Database save failed for job ${job.id}:`, dbError);
        toast({
          title: "Database Warning",
          description: "Job created successfully but database save failed. Job may not persist on refresh.",
          variant: "destructive"
        });
        // Don't throw - the OpenAI job was created successfully
      }

      // Call the onJobUpdate callback if provided
      if (options.onJobUpdate) {
        try {
          options.onJobUpdate(job);
        } catch (callbackError) {
          console.error('[BATCH CREATION] Error in onJobUpdate callback:', callbackError);
        }
      }
      
      // Emit batch job update to refresh UI
      emitBatchJobUpdate();
      
      return job;

    } catch (error) {
      console.error('[BATCH CREATION] Failed to create batch job:', error);
      
      // Detect and handle specific OpenAI API errors
      const { code, message, retryable } = detectOpenAIError(error);
      
      const appError = new BatchProcessingError(code, message, undefined, retryable, 'Batch Creation');
      
      if (!options.silent) {
        setError('create', appError.message);
        showErrorToast(appError, 'Batch Creation');
      }
      
      return null;

    } finally {
      jobCreationInProgress.current.delete(jobKey);
    }
  }, [addJob, setError, clearError, toast]);

  return { createBatch };
};