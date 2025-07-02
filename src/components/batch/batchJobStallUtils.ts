import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { PayeeRowData } from "@/lib/rowMapping";

export const createStallDetection = (
  detectStalledJob: (job: BatchJob) => boolean,
  payeeRowDataMap: Record<string, PayeeRowData>
) => {
  // New function to provide stall recovery suggestions
  const getStalledJobActions = (job: BatchJob) => {
    if (!detectStalledJob(job)) return null;
    
    return {
      isStalled: true,
      suggestions: [
        'Try refreshing the job status first',
        'If still stalled, cancel and create a new batch job',
        'Check your OpenAI API key and quota status',
        'Consider using single classification as an alternative'
      ],
      canCancel: ['validating', 'in_progress', 'finalizing'].includes(job.status),
      payeeCount: payeeRowDataMap[job.id]?.uniquePayeeNames?.length || 0
    };
  };

  return {
    getStalledJobActions,
    detectStalledJob
  };
};