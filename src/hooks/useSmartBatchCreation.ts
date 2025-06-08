
import { useCallback } from 'react';
import { createBatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { DEFAULT_CLASSIFICATION_CONFIG } from '@/lib/classification/config';
import { useToast } from '@/hooks/use-toast';

export const useSmartBatchCreation = () => {
  const { toast } = useToast();

  const createBatchWithFallback = useCallback(async (
    payeeRowData: PayeeRowData,
    description?: string
  ) => {
    console.log('[SMART BATCH] Creating intelligent batch job...');

    try {
      const batchSize = payeeRowData.uniquePayeeNames.length;
      let adjustedDescription = description || `Smart batch: ${payeeRowData.uniquePayeeNames.length} payees`;

      if (batchSize > 1000) {
        adjustedDescription += ' (Large batch - using optimized processing)';
      }

      const job = await createBatchJob(payeeRowData.uniquePayeeNames, adjustedDescription);
      return job;

    } catch (error) {
      console.error('[SMART BATCH] Job creation failed:', error);
      
      if (error instanceof Error && error.message.toLowerCase().includes('quota')) {
        toast({
          title: "API Quota Reached",
          description: "Switching to enhanced local processing automatically...",
        });
        
        return await handleQuotaFallback(payeeRowData);
      }

      throw error;
    }
  }, [toast]);

  const handleQuotaFallback = async (payeeRowData: PayeeRowData) => {
    const { enhancedProcessBatchV3 } = await import('@/lib/classification/enhancedBatchProcessorV3');
    
    try {
      const localResults = await enhancedProcessBatchV3(
        payeeRowData.uniquePayeeNames,
        { 
          ...DEFAULT_CLASSIFICATION_CONFIG,
          offlineMode: true, 
          aiThreshold: 80 
        },
        payeeRowData.originalFileData
      );

      toast({
        title: "Processing Complete",
        description: `Successfully processed ${localResults.results.length} payees using enhanced local classification.`,
      });

      return null; // Return null to indicate local processing was used
    } catch (localError) {
      console.error('[SMART BATCH] Local fallback failed:', localError);
      throw localError;
    }
  };

  return {
    createBatchWithFallback,
    handleQuotaFallback
  };
};
