import React from 'react';
import { render } from '@testing-library/react';
import { UnifiedProgressProvider, useUnifiedProgress } from './UnifiedProgressContext';
import { vi, describe, it, expect } from 'vitest';

const TestComponent: React.FC = () => {
  const { completeProgress } = useUnifiedProgress();
  React.useEffect(() => {
    completeProgress('test');
  }, [completeProgress]);
  return null;
};

describe('UnifiedProgressProvider', () => {
  it('clears pending timeouts on unmount', () => {
    vi.useFakeTimers();
    const { unmount } = render(
      <UnifiedProgressProvider>
        <TestComponent />
      </UnifiedProgressProvider>
    );
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
});
