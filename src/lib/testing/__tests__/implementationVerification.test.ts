import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock logger
vi.mock('@/lib/logging/logger', () => ({ logger: { info: vi.fn() } }));

// Mock Supabase client
const supabaseMock = { from: vi.fn() };
vi.mock('@/integrations/supabase/client', () => ({ supabase: supabaseMock }));

// Mock OpenAI client
const openaiMock = {
  isOpenAIInitialized: vi.fn(),
  testOpenAIConnection: vi.fn()
};
vi.mock('@/lib/openai/client', () => openaiMock);

import { ImplementationVerifier } from '../implementationVerification';

describe('ImplementationVerifier.verifyImplementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.from.mockReset();
  });

  it('returns complete report when all phases succeed', async () => {
    // Supabase success behaviour
    supabaseMock.from.mockImplementation((table: string) => {
      const select = vi.fn().mockReturnThis();
      const limit = vi.fn().mockResolvedValue({ data: [], error: null });
      const eq = vi.fn().mockResolvedValue({
        data: [{ csv_file_url: 'csv', excel_file_url: 'excel' }],
        error: null
      });
      if (table === 'file_generation_queue') {
        return { select, limit };
      }
      return { select, limit, eq };
    });

    // OpenAI success behaviour
    openaiMock.isOpenAIInitialized.mockReturnValue(true);
    openaiMock.testOpenAIConnection.mockResolvedValue(true);

    // Provide window and storage mocks
    (global as any).window = {
      localStorage: { getItem: vi.fn().mockReturnValue('data') },
      performance: { memory: { usedJSHeapSize: 1024 * 1024 } }
    };

    const report = await ImplementationVerifier.verifyImplementation();

    expect(report.overallStatus).toBe('complete');
    expect(report.completionPercentage).toBe(100);
    expect(report.phases.every(p => p.completed)).toBe(true);
    expect(report.criticalIssues).toHaveLength(0);

    delete (global as any).window;
  });

  it('returns failure report when phases encounter errors', async () => {
    // Supabase failure for Phase 1
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'batch_jobs') {
        throw new Error('db failure');
      }
      const select = vi.fn().mockReturnThis();
      const limit = vi.fn().mockResolvedValue({ data: [], error: null });
      return { select, limit };
    });

    // OpenAI failure
    openaiMock.isOpenAIInitialized.mockReturnValue(true);
    openaiMock.testOpenAIConnection.mockImplementation(() => {
      throw new Error('openai failure');
    });

    // Ensure no browser environment
    delete (global as any).window;

    const report = await ImplementationVerifier.verifyImplementation();

    expect(report.overallStatus).toBe('failed');
    expect(report.completionPercentage).toBeLessThan(100);
    expect(report.criticalIssues.length).toBeGreaterThan(0);
    expect(report.phases.some(p => !p.completed)).toBe(true);
  });
});

