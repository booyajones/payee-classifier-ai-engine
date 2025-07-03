import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useBatchJobActionsHandler } from '../BatchJobActionsHandler';

// mocks
const toastMock = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));

const handleCancelJobMock = vi.fn();
vi.mock('@/hooks/useBatchJobCancellation', () => ({
  useBatchJobCancellation: () => ({ handleCancelJob: handleCancelJobMock })
}));

const updateJobMock = vi.fn();
vi.mock('@/stores/batchJobStore', () => ({
  useBatchJobStore: (selector: any) => selector({ updateJob: updateJobMock })
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useBatchJobActionsHandler.handleCancel', () => {
  it('cancels job and shows success toast', async () => {
    handleCancelJobMock.mockResolvedValue({});

    const { result } = renderHook(() => useBatchJobActionsHandler());

    await act(async () => {
      await result.current.handleCancel('1');
    });

    expect(handleCancelJobMock).toHaveBeenCalledWith('1');
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Job Cancelled' }));
  });

  it('shows error toast on failure', async () => {
    handleCancelJobMock.mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useBatchJobActionsHandler());

    await act(async () => {
      await result.current.handleCancel('1');
    });

    expect(handleCancelJobMock).toHaveBeenCalledWith('1');
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Cancel Failed' }));
  });
});
