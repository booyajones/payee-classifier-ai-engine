
import { useCallback } from 'react';
import { BatchJob, cancelBatchJob, createBatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { enhancedProcessBatchV3 } from '@/lib/classification/enhancedBatchProcessorV3';
import { mapResultsToOriginalRows } from '@/lib/rowMapping';
import { useToast } from '@/hooks/use-toast';

export const useEnhancedBatchRecovery = () => {
  const { toast } = useToast();

  const recoverStuckJob = useCallback(async (
    job: BatchJob,
    payeeRowData: PayeeRowData,
    onJobComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void
  ): Promise<boolean> => {
    console.log(`[RECOVERY] Starting enhanced recovery for stuck job ${job.id}`);

    try {
      // Strategy 1: Try to cancel and recreate the batch job
      toast({
        title: "Recovery Started",
        description: "Attempting to recover stuck batch job...",
      });

      try {
        console.log(`[RECOVERY] Attempting to cancel stuck job ${job.id}`);
        await cancelBatchJob(job.id);
        
        // Wait a moment for cancellation to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log(`[RECOVERY] Creating replacement batch job`);
        const newJob = await createBatchJob(
          payeeRowData.uniquePayeeNames,
          `Recovery: ${job.metadata?.description || 'Payee classification'}`
        );
        
        toast({
          title: "Job Recreated",
          description: `Created new batch job ${newJob.id.slice(-8)} to replace stuck job.`,
        });

        return true; // New job created, let normal processing continue

      } catch (batchError) {
        console.warn(`[RECOVERY] Batch recreation failed:`, batchError);
        
        // Strategy 2: Fallback to enhanced local processing
        console.log(`[RECOVERY] Falling back to enhanced local processing`);
        
        toast({
          title: "Using Local Processing",
          description: "Batch API unavailable, processing locally with enhanced classification...",
        });

        const localResults = await enhancedProcessBatchV3(
          payeeRowData.uniquePayeeNames,
          { 
            offlineMode: true, 
            aiThreshold: 75,
            bypassRuleNLP: true
          },
          payeeRowData.originalFileData
        );

        // Map unique results to all original rows
        const mappedResults = mapResultsToOriginalRows(localResults.results, payeeRowData);

        // Convert to final classifications
        const finalClassifications: PayeeClassification[] = mappedResults.map((mappedRow, index) => ({
          id: `recovered-${job.id}-row-${index}`,
          payeeName: mappedRow.PayeeName || mappedRow.payeeName || 'Unknown',
          result: {
            classification: mappedRow.classification || 'Individual',
            confidence: parseInt(mappedRow.confidence) || 50,
            reasoning: `${mappedRow.reasoning || 'Enhanced local classification'} (Recovered from stuck batch job)`,
            processingTier: mappedRow.processingTier || 'AI-Powered',
            processingMethod: 'Enhanced Local Recovery',
            keywordExclusion: {
              isExcluded: mappedRow.keywordExclusion === 'Yes',
              matchedKeywords: mappedRow.matchedKeywords ? mappedRow.matchedKeywords.split('; ').filter(k => k) : [],
              confidence: parseInt(mappedRow.keywordConfidence) || 0,
              reasoning: mappedRow.keywordReasoning || 'No keyword exclusion applied'
            }
          },
          timestamp: new Date(mappedRow.timestamp || Date.now()),
          originalData: mappedRow,
          rowIndex: index
        }));

        const summary: BatchProcessingResult = {
          results: finalClassifications,
          successCount: finalClassifications.filter(c => c.result.processingTier !== 'Failed').length,
          failureCount: finalClassifications.filter(c => c.result.processingTier === 'Failed').length,
          originalFileData: mappedResults
        };

        // Complete the job with recovered results
        onJobComplete(finalClassifications, summary, job.id);

        toast({
          title: "Recovery Complete",
          description: `Successfully recovered ${finalClassifications.length} classifications using enhanced local processing.`,
        });

        return true;
      }

    } catch (error) {
      console.error(`[RECOVERY] Recovery failed for job ${job.id}:`, error);
      
      toast({
        title: "Recovery Failed",
        description: "Unable to recover the stuck job. Please try cancelling and resubmitting manually.",
        variant: "destructive",
      });

      return false;
    }
  }, [toast]);

  const canRecoverJob = useCallback((job: BatchJob): boolean => {
    return ['in_progress', 'validating'].includes(job.status);
  }, []);

  return {
    recoverStuckJob,
    canRecoverJob
  };
};
