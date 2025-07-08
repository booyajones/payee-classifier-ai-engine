import { BatchJob } from '@/lib/openai/trueBatchAPI';

/**
 * Hook for detecting stalled batch jobs based on processing time and progress
 */
export const useBatchJobStallDetection = () => {
  const detectStalledJob = (job: BatchJob): boolean => {
    if (job.status !== 'in_progress') return false;
    
    // Check if job has been processing for too long
    const createdTime = new Date(job.created_at * 1000);
    const timeSinceCreated = Date.now() - createdTime.getTime();
    
    // Dynamic stall thresholds based on job size and progress status
    const jobSize = job.request_counts.total;
    const hasStartedProcessing = job.request_counts.completed > 0;
    
    // More generous thresholds for OpenAI Batch API
    const queueThreshold = jobSize <= 100 ? 30 * 60 * 1000 :    // 30 minutes for small jobs
                          jobSize <= 1000 ? 2 * 60 * 60 * 1000 : // 2 hours for medium jobs  
                          4 * 60 * 60 * 1000;                    // 4 hours for large jobs
    
    // Only flag jobs that haven't started processing after reasonable queue time
    const hasNoProgress = !hasStartedProcessing && timeSinceCreated > queueThreshold;
    
    // For jobs that started processing, be much more lenient
    // Only flag if job has made minimal progress and hasn't advanced in a very long time
    const hasMinimalProgress = hasStartedProcessing && 
                              job.request_counts.completed < (job.request_counts.total * 0.02) && // Less than 2% done
                              timeSinceCreated > (6 * 60 * 60 * 1000); // AND been running over 6 hours
    
    const isStalled = hasNoProgress || hasMinimalProgress;
    
    console.log(`[STALL DETECTION] Job ${job.id}: progress=${job.request_counts.completed}/${job.request_counts.total}, time=${Math.round(timeSinceCreated/60000)}min, started=${hasStartedProcessing}, stalled=${isStalled}`);
    
    return isStalled;
  };

  return { detectStalledJob };
};