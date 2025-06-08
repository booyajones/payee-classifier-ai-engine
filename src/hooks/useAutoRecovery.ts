
import { useState, useEffect, useCallback } from 'react';
import { BatchJob, checkBatchJobStatus, createBatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { enhancedProcessBatchV3 } from '@/lib/classification/enhancedBatchProcessorV3';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface AutoRecoveryState {
  isRecovering: boolean;
  recoveryAttempts: number;
  lastRecoveryTime?: Date;
}

export const useAutoRecovery = () => {
  const [recoveryStates, setRecoveryStates] = useState<Record<string, AutoRecoveryState>>({});
  const { toast } = useToast();

  const shouldAutoRecover = useCallback((job: BatchJob): boolean => {
    const state = recoveryStates[job.id];
    const maxAttempts = 3;
    const cooldownMinutes = 10;

    // Don't recover if already at max attempts
    if (state?.recoveryAttempts >= maxAttempts) return false;

    // Don't recover if in cooldown period
    if (state?.lastRecoveryTime) {
      const timeSince = Date.now() - state.lastRecoveryTime.getTime();
      if (timeSince < cooldownMinutes * 60 * 1000) return false;
    }

    // Recover failed, expired, or stuck jobs
    return ['failed', 'expired'].includes(job.status) || 
           (job.status === 'in_progress' && isJobStuck(job));
  }, [recoveryStates]);

  const isJobStuck = (job: BatchJob): boolean => {
    // Consider job stuck if in progress for more than 2 hours
    const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
    return job.in_progress_at ? job.in_progress_at * 1000 < twoHoursAgo : false;
  };

  const attemptAutoRecovery = useCallback(async (
    job: BatchJob,
    payeeRowData: PayeeRowData,
    onJobUpdate: (job: BatchJob) => void,
    onJobComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void
  ): Promise<boolean> => {
    const jobId = job.id;
    const state = recoveryStates[jobId] || { isRecovering: false, recoveryAttempts: 0 };

    if (!shouldAutoRecover(job) || state.isRecovering) {
      return false;
    }

    console.log(`[AUTO-RECOVERY] Starting recovery for job ${jobId} (attempt ${state.recoveryAttempts + 1})`);

    setRecoveryStates(prev => ({
      ...prev,
      [jobId]: {
        ...state,
        isRecovering: true,
        recoveryAttempts: state.recoveryAttempts + 1,
        lastRecoveryTime: new Date()
      }
    }));

    try {
      // Strategy 1: Try to recreate the batch job
      if (state.recoveryAttempts < 2) {
        try {
          const newJob = await createBatchJob(
            payeeRowData.uniquePayeeNames,
            `Auto-recovery: ${job.metadata?.description || 'Payee classification'}`
          );
          
          onJobUpdate(newJob);
          
          toast({
            title: "Job Auto-Recovered",
            description: `Created new batch job ${newJob.id.slice(-8)} to replace failed job.`,
          });

          setRecoveryStates(prev => ({
            ...prev,
            [jobId]: { ...prev[jobId], isRecovering: false }
          }));

          return true;
        } catch (batchError) {
          console.warn(`[AUTO-RECOVERY] Batch recreation failed for ${jobId}:`, batchError);
        }
      }

      // Strategy 2: Fallback to local enhanced processing
      console.log(`[AUTO-RECOVERY] Falling back to local processing for job ${jobId}`);
      
      const localResults = await enhancedProcessBatchV3(
        payeeRowData.uniquePayeeNames,
        { offlineMode: true, aiThreshold: 75 },
        payeeRowData.originalFileData
      );

      // Convert to PayeeClassification format
      const classifications: PayeeClassification[] = localResults.results.map((result, index) => ({
        id: `recovered-${jobId}-${index}`,
        payeeName: result.payeeName,
        result: {
          ...result.result,
          reasoning: `${result.result.reasoning} (Auto-recovered via local processing)`
        },
        timestamp: result.timestamp,
        originalData: result.originalData,
        rowIndex: result.rowIndex
      }));

      onJobComplete(classifications, localResults, jobId);

      toast({
        title: "Job Auto-Recovered",
        description: `Completed processing ${classifications.length} payees using enhanced local classification.`,
      });

      setRecoveryStates(prev => ({
        ...prev,
        [jobId]: { ...prev[jobId], isRecovering: false }
      }));

      return true;

    } catch (error) {
      console.error(`[AUTO-RECOVERY] Recovery failed for job ${jobId}:`, error);
      
      setRecoveryStates(prev => ({
        ...prev,
        [jobId]: { ...prev[jobId], isRecovering: false }
      }));

      return false;
    }
  }, [recoveryStates, shouldAutoRecover, toast]);

  const getRecoveryState = useCallback((jobId: string) => {
    return recoveryStates[jobId] || { isRecovering: false, recoveryAttempts: 0 };
  }, [recoveryStates]);

  return {
    attemptAutoRecovery,
    getRecoveryState,
    shouldAutoRecover
  };
};
