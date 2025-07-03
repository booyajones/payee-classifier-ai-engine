import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useDownloadHandler } from '../useDownloadHandler';

// mocks
const toastMock = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));

const downloadFileMock = vi.fn();
vi.mock('../useEnhancedDownload', () => ({ useEnhancedDownload: () => ({ downloadFile: downloadFileMock }) }));

const downloadFromStorageMock = vi.fn();
vi.mock('@/lib/storage/preGeneratedFileService', () => ({ PreGeneratedFileService: { downloadFileFromStorage: downloadFromStorageMock } }));

const processJobMock = vi.fn();
vi.mock('@/lib/services/automaticFileGenerationService', () => ({ AutomaticFileGenerationService: { processCompletedJob: processJobMock } }));

const convertJobMock = vi.fn(() => ({ id: '1' }));
vi.mock('@/lib/utils/batchJobConverter', () => ({ convertToBatchJob: convertJobMock }));

const singleMock = vi.fn();
const eqMock = vi.fn(() => ({ single: singleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: fromMock } }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useDownloadHandler', () => {
  it('uses existing url', async () => {
    singleMock.mockResolvedValue({});
    const setFileStatus = vi.fn();
    const { result } = renderHook(() => useDownloadHandler({ csvUrl: 'csv', excelUrl: 'excel' }, setFileStatus));

    await act(async () => {
      await result.current.handleDownload('csv');
    });

    expect(downloadFromStorageMock).toHaveBeenCalledWith('csv', expect.stringContaining('.csv'));
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Download Complete' }));
  });

  it('generates files when no url', async () => {
    singleMock
      .mockResolvedValueOnce({ data: { id: '1' } })
      .mockResolvedValueOnce({ data: { csv_file_url: 'newCsv', excel_file_url: 'newX' } });

    const setFileStatus = vi.fn();
    const { result } = renderHook(() => useDownloadHandler({}, setFileStatus, '1'));

    await act(async () => {
      await result.current.handleDownload('csv');
    });

    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Preparing Download' }));
    expect(processJobMock).toHaveBeenCalled();
    expect(downloadFromStorageMock).toHaveBeenCalledWith('newCsv', expect.stringContaining('.csv'));
    expect(setFileStatus).toHaveBeenCalled();
  });

  it('falls back on error', async () => {
    singleMock.mockResolvedValueOnce({ error: 'fail' });
    const setFileStatus = vi.fn();
    const processingSummary = { results: [] } as any;
    const { result } = renderHook(() => useDownloadHandler({}, setFileStatus, '1', processingSummary));

    await act(async () => {
      await result.current.handleDownload('csv');
    });

    expect(downloadFileMock).toHaveBeenCalledWith(processingSummary, 'csv');
  });
});
