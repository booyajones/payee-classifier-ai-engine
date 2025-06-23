
import { useState } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { useEnhancedBatchRecovery } from '@/hooks/useEnhancedBatchRecovery';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';

interface BatchJobRecoveryProps {
  payeeRowDataMap: Record<string, PayeeRowData>;
  onJobComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
}

export const useBatchJobRecovery = ({ payeeRowDataMap, onJobComplete }: BatchJobRecoveryProps) => {
  const [recoveringJobs, setRecoveringJobs] = useState<Set<string>>(new Set());
  const { recoverStuckJob } = useEnhancedBatchRecovery();

  const handleJobRecovery = async (job: BatchJob) => {
    const payeeRowData = payeeRowDataMap[job.id];
    if (!payeeRowData) {
      console.error(`[RECOVERY] No payee row data found for job ${job.id}`);
      return;
    }

    setRecoveringJobs(prev => new Set([...prev, job.id]));
    
    try {
      console.log(`[RECOVERY] Starting recovery for job ${job.id}`);
      const success = await recoverStuckJob(job, payeeRowData, onJobComplete);
      
      if (success) {
        console.log(`[RECOVERY] Job ${job.id} recovery completed successfully`);
      } else {
        console.error(`[RECOVERY] Job ${job.id} recovery failed`);
      }
    } catch (error) {
      console.error(`[RECOVERY] Error during job ${job.id} recovery:`, error);
    } finally {
      setRecoveringJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(job.id);
        return newSet;
      });
    }
  };

  return {
    recoveringJobs,
    handleJobRecovery
  };
};
