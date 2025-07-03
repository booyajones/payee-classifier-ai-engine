import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PreGeneratedFileService } from '../preGeneratedFileService';

describe('PreGeneratedFileService.downloadFileFromStorage', () => {
  const originalCreateObjectURL = window.URL.createObjectURL;
  const originalRevokeObjectURL = window.URL.revokeObjectURL;
  const anchor = { click: vi.fn(), set href(v: string) {}, set download(v: string) {} } as any;

  beforeEach(() => {
    vi.restoreAllMocks();
    window.URL.createObjectURL = vi.fn(() => 'blob:url');
    window.URL.revokeObjectURL = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
  });

  afterEach(() => {
    window.URL.createObjectURL = originalCreateObjectURL;
    window.URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('downloads file successfully', async () => {
    const blob = new Blob(['data']);
    global.fetch = vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(blob) } as any);

    await PreGeneratedFileService.downloadFileFromStorage('http://test', 'file.csv');

    expect(global.fetch).toHaveBeenCalledWith('http://test');
    expect(anchor.click).toHaveBeenCalled();
    expect(window.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('throws when download fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, statusText: 'Not Found' } as any);

    await expect(PreGeneratedFileService.downloadFileFromStorage('bad', 'file.csv')).rejects.toThrow('Failed to download file');
  });
});
