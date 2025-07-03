import { supabase } from '@/integrations/supabase/client';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { EnhancedFileGenerationService } from '@/lib/services/enhancedFileGenerationService';
import { AutomaticResultProcessor } from '@/lib/services/automaticResultProcessor';
import { productionLogger } from '@/lib/logging/productionLogger';

const POLL_INTERVAL = 15000; // 15 seconds
const MAX_RETRIES = 3;
let intervalId: NodeJS.Timeout | null = null;

/** Start polling the file_generation_queue */
export function startWorker() {
  if (intervalId) return;
  runOnce();
  intervalId = setInterval(runOnce, POLL_INTERVAL);
  productionLogger.info('Background file generation worker started', undefined, 'WORKER');
}

/** Stop polling */
export function stopWorker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    productionLogger.info('Background file generation worker stopped', undefined, 'WORKER');
  }
}

async function runOnce() {
  try {
    await processQueue();
  } catch (error) {
    productionLogger.error('Queue processing failed', error, 'WORKER');
  }
}

export async function processQueue() {
  // Reset stalled items (>5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: stalledItems } = await supabase
    .from('file_generation_queue')
    .update({
      status: 'pending',
      retry_count: 0,
      last_error: 'Reset due to processing timeout',
      updated_at: new Date().toISOString()
    })
    .eq('status', 'processing')
    .lt('updated_at', fiveMinutesAgo)
    .select('id');

  if (stalledItems && stalledItems.length > 0) {
    productionLogger.warn(`Reset ${stalledItems.length} stalled items`, undefined, 'WORKER');
  }

  const { data: queueItems, error } = await supabase
    .from('file_generation_queue')
    .select('*')
    .eq('status', 'pending')
    .lt('retry_count', MAX_RETRIES)
    .order('created_at', { ascending: true })
    .limit(2);

  if (error) {
    productionLogger.error('Failed to fetch queue items', error, 'WORKER');
    return;
  }

  if (!queueItems || queueItems.length === 0) {
    await checkMissedJobs();
    return;
  }

  for (const item of queueItems) {
    try {
      await processQueueItem(item);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (itemError) {
      productionLogger.error(`Failed to process item ${item.id}`, itemError, 'WORKER');
    }
  }
}

async function processQueueItem(item: any) {
  const { id, batch_job_id, retry_count } = item;
  try {
    await supabase
      .from('file_generation_queue')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', id);

    const { data: jobData, error: jobError } = await supabase
      .from('batch_jobs')
      .select('*')
      .eq('id', batch_job_id)
      .single();

    if (jobError || !jobData) {
      throw new Error(`Failed to fetch batch job: ${jobError?.message}`);
    }

    const batchJob: BatchJob = {
      id: jobData.id,
      status: jobData.status as BatchJob['status'],
      created_at: jobData.created_at_timestamp,
      request_counts: {
        total: jobData.request_counts_total,
        completed: jobData.request_counts_completed,
        failed: jobData.request_counts_failed
      },
      in_progress_at: jobData.in_progress_at_timestamp,
      finalizing_at: jobData.finalizing_at_timestamp,
      completed_at: jobData.completed_at_timestamp,
      failed_at: jobData.failed_at_timestamp,
      expired_at: jobData.expired_at_timestamp,
      cancelled_at: jobData.cancelled_at_timestamp,
      metadata: jobData.metadata ? (typeof jobData.metadata === 'string' ? JSON.parse(jobData.metadata) : jobData.metadata) : undefined,
      errors: jobData.errors ? (typeof jobData.errors === 'string' ? JSON.parse(jobData.errors) : jobData.errors) : undefined,
      output_file_id: jobData.output_file_id || undefined
    };

    await AutomaticResultProcessor.processCompletedBatch(batchJob);
    const fileResult = await EnhancedFileGenerationService.processCompletedJob(batchJob);

    if (!fileResult.success) {
      throw new Error(`File generation failed: ${fileResult.error}`);
    }

    await supabase
      .from('file_generation_queue')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    productionLogger.info(`Successfully processed queue item for job ${batch_job_id}`, undefined, 'WORKER');
  } catch (error) {
    const newRetryCount = retry_count + 1;
    const status = newRetryCount >= MAX_RETRIES ? 'failed' : 'pending';
    await supabase
      .from('file_generation_queue')
      .update({
        status,
        retry_count: newRetryCount,
        last_error: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    productionLogger.error(`Failed to process queue item for job ${batch_job_id}`, error, 'WORKER');
  }
}

async function checkMissedJobs() {
  const { data: missedJobs, error } = await supabase
    .from('batch_jobs')
    .select('id')
    .eq('status', 'completed')
    .gt('request_counts_completed', 0)
    .or('csv_file_url.is.null,excel_file_url.is.null')
    .limit(10);

  if (error || !missedJobs || missedJobs.length === 0) return;

  productionLogger.info(`Found ${missedJobs.length} missed jobs, adding to queue`, undefined, 'WORKER');

  for (const job of missedJobs) {
    await supabase
      .from('file_generation_queue')
      .upsert({
        batch_job_id: job.id,
        status: 'pending',
        retry_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'batch_job_id'
      });
  }
}

export async function getQueueStatus() {
  try {
    const { data, error } = await supabase
      .from('file_generation_queue')
      .select('status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    if (error || !data) {
      return { pending: 0, processing: 0, completed: 0, failed: 0 };
    }
    const counts = data.reduce((acc, item) => {
      acc[item.status as keyof typeof acc] = (acc[item.status as keyof typeof acc] || 0) + 1;
      return acc;
    }, { pending: 0, processing: 0, completed: 0, failed: 0 });
    return counts;
  } catch (error) {
    productionLogger.error('Error getting queue status', error, 'WORKER');
    return { pending: 0, processing: 0, completed: 0, failed: 0 };
  }
}

if (require.main === module) {
  startWorker();
}
