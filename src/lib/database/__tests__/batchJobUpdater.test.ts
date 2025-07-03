import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BatchJobUpdater } from '../batchJobUpdater';
import type { BatchJob } from '@/lib/openai/trueBatchAPI';

vi.mock('@/lib/services/automaticResultProcessor', () => ({
  AutomaticResultProcessor: { processCompletedBatch: vi.fn().mockResolvedValue(true) }
}));
vi.mock('@/lib/services/enhancedFileGenerationService', () => ({
  EnhancedFileGenerationService: { processCompletedJob: vi.fn().mockResolvedValue({ success: true }) }
}));

const sampleJob: BatchJob = {
  id: '1',
  status: 'completed',
  created_at: 0,
  request_counts: { total: 1, completed: 1, failed: 0 }
};

describe('BatchJobUpdater.updateBatchJobStatus', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (BatchJobUpdater as any).checkIfAlreadyProcessed = vi.fn().mockResolvedValue(false);
    vi.spyOn(BatchJobUpdater as any, 'updateJobStatus').mockResolvedValue(undefined);
  });

  it('marks job completed when verification passes', async () => {
    (BatchJobUpdater as any).verifyFileCreation = vi.fn().mockResolvedValue(true);

    await BatchJobUpdater.updateBatchJobStatus(sampleJob);

    const calls = (BatchJobUpdater as any).updateJobStatus.mock.calls;
    expect(calls[calls.length - 1][1]).toBe('completed');
  });

  it('marks job failed when verification fails', async () => {
    (BatchJobUpdater as any).verifyFileCreation = vi.fn().mockResolvedValue(false);

    await BatchJobUpdater.updateBatchJobStatus(sampleJob);

    const calls = (BatchJobUpdater as any).updateJobStatus.mock.calls;
    expect(calls[calls.length - 1][1]).toBe('failed');
  });
});
