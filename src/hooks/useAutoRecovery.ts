
import { useState, useEffect, useCallback } from 'react';
import { BatchJob, checkBatchJobStatus, createBatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { processBatch } from '@/lib/classification/finalBatchProcessor';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { DEFAULT_CLASSIFICATION_CONFIG } from '@/lib/classification/config';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logging';

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

    logger.info(`Starting recovery for job ${jobId} (attempt ${state.recoveryAttempts + 1})`, { jobId, attempt: state.recoveryAttempts + 1 }, 'AUTO_RECOVERY');

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
          logger.warn(`Batch recreation failed for ${jobId}`, batchError, 'AUTO_RECOVERY');
        }
      }

      // Strategy 2: Fallback to local enhanced processing
      logger.info(`Falling back to local processing for job ${jobId}`, { jobId }, 'AUTO_RECOVERY');
      
      const localResults = await processBatch(
        payeeRowData.uniquePayeeNames,
        { 
          ...DEFAULT_CLASSIFICATION_CONFIG,
          offlineMode: true, 
          aiThreshold: 75 
        },
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
      logger.error(`Recovery failed for job ${jobId}`, error, 'AUTO_RECOVERY');
      
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
