
import React from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import VirtualizedBatchJobList from './VirtualizedBatchJobList';

interface BatchJobListProps {
  jobs: BatchJob[];
  payeeRowDataMap: Record<string, PayeeRowData>;
  refreshingJobs: Set<string>;
  pollingStates: Record<string, { isPolling: boolean }>;
  autoPollingJobs: Set<string>; // Track auto-polling jobs
  stalledJobActions?: Record<string, any>;
  onRefresh: (jobId: string) => Promise<void>;
  onForceRefresh?: (jobId: string) => Promise<void>; // FORCE REFRESH: Debug capability
  onForceSync?: (jobId: string) => Promise<BatchJob>; // EMERGENCY FIX
  onDownload: (job: BatchJob) => Promise<void>;
  onCancel: (jobId: string) => void;
  onJobDelete: (jobId: string) => void;
}

const BatchJobList = (props: BatchJobListProps) => {
  console.log(`[BATCH JOB LIST] Rendering ${props.jobs.length} jobs with virtualization`);
  
  // PERFORMANCE: Use virtualized list for better performance with many jobs
  return <VirtualizedBatchJobList {...props} />;
};

export default BatchJobList;
