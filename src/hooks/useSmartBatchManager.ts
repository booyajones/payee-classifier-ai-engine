import { useState, useCallback, useRef } from 'react';
import { BatchJob, createBatchJob, checkBatchJobStatus } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { DEFAULT_CLASSIFICATION_CONFIG } from '@/lib/classification/config';
import { useAutoRecovery } from './useAutoRecovery';
import { useBatchJobActions } from '@/components/batch/useBatchJobActions';
import { useToast } from '@/hooks/use-toast';

interface SmartBatchState {
  isProcessing: boolean;
  currentStage: string;
  progress: number;
  autoRetryCount: number;
  hasQuotaIssue: boolean;
}

export const useSmartBatchManager = () => {
  const [smartStates, setSmartStates] = useState<Record<string, SmartBatchState>>({});
  const { attemptAutoRecovery, getRecoveryState } = useAutoRecovery();
  const retryTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const { toast } = useToast();

  const createSmartBatchJob = useCallback(async (
    payeeRowData: PayeeRowData,
    description?: string,
    onJobUpdate?: (job: BatchJob) => void,
    onJobComplete?: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void
  ): Promise<BatchJob | null> => {
    console.log('[SMART BATCH] Creating intelligent batch job...');

    try {
      // Adaptive batch sizing based on quota and complexity
      const batchSize = payeeRowData.uniquePayeeNames.length;
      let adjustedDescription = description || `Smart batch: ${payeeRowData.uniquePayeeNames.length} payees`;

      if (batchSize > 1000) {
        adjustedDescription += ' (Large batch - using optimized processing)';
      }

      const job = await createBatchJob(payeeRowData.uniquePayeeNames, adjustedDescription);
      
      // Initialize smart state
      setSmartStates(prev => ({
        ...prev,
        [job.id]: {
          isProcessing: true,
          currentStage: 'Batch job created',
          progress: 10,
          autoRetryCount: 0,
          hasQuotaIssue: false
        }
      }));

      // Start intelligent monitoring
      startIntelligentMonitoring(job, payeeRowData, onJobUpdate, onJobComplete);

      return job;

    } catch (error) {
      console.error('[SMART BATCH] Job creation failed:', error);
      
      // Check if it's a quota issue
      if (error instanceof Error && error.message.toLowerCase().includes('quota')) {
        toast({
          title: "API Quota Reached",
          description: "Switching to enhanced local processing automatically...",
        });
        
        // Auto-fallback to local processing
        return handleQuotaFallback(payeeRowData, onJobComplete);
      }

      throw error;
    }
  }, [attemptAutoRecovery, toast]);

  const handleQuotaFallback = async (
    payeeRowData: PayeeRowData,
    onJobComplete?: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void
  ): Promise<null> => {
    // Import enhanced processor dynamically
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

      const classifications: PayeeClassification[] = localResults.results.map((result, index) => ({
        id: `local-${Date.now()}-${index}`,
        payeeName: result.payeeName,
        result: {
          ...result.result,
          reasoning: `${result.result.reasoning} (Auto-processed locally due to API quota)`
        },
        timestamp: result.timestamp,
        originalData: result.originalData,
        rowIndex: result.rowIndex
      }));

      if (onJobComplete) {
        onJobComplete(classifications, localResults, 'local-processing');
      }

      toast({
        title: "Processing Complete",
        description: `Successfully processed ${classifications.length} payees using enhanced local classification.`,
      });

    } catch (localError) {
      console.error('[SMART BATCH] Local fallback failed:', localError);
      throw localError;
    }

    return null;
  };

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
        
        // Update progress based on job status
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

        // Check if job needs recovery
        if (['failed', 'expired'].includes(updatedJob.status)) {
          console.log(`[SMART BATCH] Job ${jobId} needs recovery: ${updatedJob.status}`);
          
          const recovered = await attemptAutoRecovery(
            updatedJob,
            payeeRowData,
            onJobUpdate || (() => {}),
            onJobComplete || (() => {})
          );

          if (!recovered) {
            // Mark as failed if recovery didn't work
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
          
          return; // Stop monitoring
        }

        // Continue monitoring if still in progress
        if (['validating', 'in_progress', 'finalizing'].includes(updatedJob.status)) {
          retryTimeouts.current[jobId] = setTimeout(monitor, 10000); // Check every 10 seconds
        } else {
          // Job completed successfully
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
        
        // Implement exponential backoff for monitoring
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

    // Start monitoring with initial delay
    retryTimeouts.current[jobId] = setTimeout(monitor, 5000);
  }, [attemptAutoRecovery, smartStates]);

  const calculateProgress = (job: BatchJob): number => {
    switch (job.status) {
      case 'validating': return 20;
      case 'in_progress': 
        const completion = job.request_counts.completed / job.request_counts.total;
        return 30 + (completion * 60); // 30-90%
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
    createSmartBatchJob,
    getSmartState,
    cleanup
  };
};
