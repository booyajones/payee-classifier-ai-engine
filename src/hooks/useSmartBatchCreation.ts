
import { useState, useCallback } from 'react';
import { BatchJob, createBatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { saveBatchJob } from '@/lib/database/batchJobService';
import { useToast } from '@/components/ui/use-toast';

export const useSmartBatchCreation = () => {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const createBatchWithFallback = useCallback(async (
    payeeRowData: PayeeRowData,
    description?: string
  ): Promise<BatchJob | null> => {
    console.log('[SMART BATCH CREATION] Starting batch job creation with database persistence');
    setIsCreating(true);

    try {
      // Create the OpenAI batch job
      const job = await createBatchJob(payeeRowData.uniquePayeeNames, description);
      console.log(`[SMART BATCH CREATION] Created OpenAI batch job: ${job.id}`);

      // Immediately save to database for persistence
      try {
        await saveBatchJob(job, payeeRowData);
        console.log(`[SMART BATCH CREATION] Successfully saved job ${job.id} to database`);
        
        toast({
          title: "Batch Job Created",
          description: `Job ${job.id.substring(0, 8)}... created and saved to database`,
        });
      } catch (dbError) {
        console.error('[SMART BATCH CREATION] Failed to save job to database:', dbError);
        toast({
          title: "Database Warning",
          description: "Job created but not saved to database. History may be lost on refresh.",
          variant: "destructive"
        });
        // Continue with the job even if database save fails
      }

      return job;

    } catch (error) {
      console.error('[SMART BATCH CREATION] Batch job creation failed:', error);
      
      toast({
        title: "Batch Creation Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
      
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, [toast]);

  const handleQuotaFallback = useCallback(async (
    payeeRowData: PayeeRowData
  ): Promise<PayeeClassification[]> => {
    console.log('[SMART BATCH CREATION] Implementing quota fallback (not implemented yet)');
    // This would implement local processing fallback
    return [];
  }, []);

  return {
    createBatchWithFallback,
    handleQuotaFallback,
    isCreating
  };
};
