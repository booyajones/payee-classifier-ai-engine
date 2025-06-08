
import { useState, useCallback, useRef } from 'react';
import { BatchJob, checkBatchJobStatus } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { useAutoRecovery } from './useAutoRecovery';

interface SmartBatchState {
  isProcessing: boolean;
  currentStage: string;
  progress: number;
  autoRetryCount: number;
  hasQuotaIssue: boolean;
}

export const useSmartBatchMonitoring = () => {
  const [smartStates, setSmartStates] = useState<Record<string, SmartBatchState>>({});
  const { attemptAutoRecovery } = useAutoRecovery();
  const retryTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  const calculateProgress = (job: BatchJob): number => {
    switch (job.status) {
      case 'validating': return 20;
      case 'in_progress': 
        const completion = job.request_counts.completed / job.request_counts.total;
        return 30 + (completion * 60);
      case 'finalizing': return 95;
      case 'completed': return 100;
      case 'failed':
      case 'expired':
      case 'cancelled': return 0;
      default: return 10;
    }
  };

  const getStageDescription = (status: string): string => {
    switch (status) {
      case 'validating': return 'Validating batch request...';
      case 'in_progress': return 'Processing payee classifications...';
      case 'finalizing': return 'Finalizing results...';
      case 'completed': return 'Processing complete!';
      case 'failed': return 'Job failed - attempting recovery...';
      case 'expired': return 'Job expired - attempting recovery...';
      case 'cancelled': return 'Job was cancelled';
      default: return 'Preparing batch job...';
    }
  };

  const initializeSmartState = useCallback((jobId: string) => {
    setSmartStates(prev => ({
      ...prev,
      [jobId]: {
        isProcessing: true,
        currentStage: 'Batch job created',
        progress: 10,
        autoRetryCount: 0,
        hasQuotaIssue: false
      }
    }));
  }, []);

  const startIntelligentMonitoring = useCallback((
    job: BatchJob,
    payeeRowData: PayeeRowData,
    onJobUpdate?: (job: BatchJob) => void,
    onJobComplete?: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void
  ) => {
    const jobId = job.id;
    
    const monitor = async () => {
      try {
        const updatedJob = await checkBatchJobStatus(jobId);
        
        const progress = calculateProgress(updatedJob);
        setSmartStates(prev => ({
          ...prev,
          [jobId]: {
            ...prev[jobId],
            currentStage: getStageDescription(updatedJob.status),
            progress
          }
        }));

        if (onJobUpdate) {
          onJobUpdate(updatedJob);
        }

        if (['failed', 'expired'].includes(updatedJob.status)) {
          console.log(`[SMART BATCH] Job ${jobId} needs recovery: ${updatedJob.status}`);
          
          const recovered = await attemptAutoRecovery(
            updatedJob,
            payeeRowData,
            onJobUpdate || (() => {}),
            onJobComplete || (() => {})
          );

          if (!recovered) {
            setSmartStates(prev => ({
              ...prev,
              [jobId]: {
                ...prev[jobId],
                isProcessing: false,
                currentStage: 'Recovery failed',
                progress: 0
              }
            }));
          }
          
          return;
        }

        if (['validating', 'in_progress', 'finalizing'].includes(updatedJob.status)) {
          retryTimeouts.current[jobId] = setTimeout(monitor, 10000);
        } else {
          setSmartStates(prev => ({
            ...prev,
            [jobId]: {
              ...prev[jobId],
              isProcessing: false,
              currentStage: 'Completed successfully',
              progress: 100
            }
          }));
        }

      } catch (error) {
        console.error(`[SMART BATCH] Monitoring error for job ${jobId}:`, error);
        
        const state = smartStates[jobId];
        const retryDelay = Math.min(30000, 5000 * Math.pow(2, state?.autoRetryCount || 0));
        
        setSmartStates(prev => ({
          ...prev,
          [jobId]: {
            ...prev[jobId],
            autoRetryCount: (prev[jobId]?.autoRetryCount || 0) + 1
          }
        }));

        retryTimeouts.current[jobId] = setTimeout(monitor, retryDelay);
      }
    };

    retryTimeouts.current[jobId] = setTimeout(monitor, 5000);
  }, [attemptAutoRecovery, smartStates]);

  const getSmartState = useCallback((jobId: string) => {
    return smartStates[jobId] || {
      isProcessing: false,
      currentStage: 'Ready',
      progress: 0,
      autoRetryCount: 0,
      hasQuotaIssue: false
    };
  }, [smartStates]);

  const cleanup = useCallback(() => {
    Object.values(retryTimeouts.current).forEach(timeout => clearTimeout(timeout));
    retryTimeouts.current = {};
  }, []);

  return {
    initializeSmartState,
    startIntelligentMonitoring,
    getSmartState,
    cleanup
  };
};
