import { describe, it, expect } from 'vitest';
import { FileGenerationService } from '../fileGenerationService';

function createData() {
  const originalFileData = [
    { payee: 'Alice', amount: 10 },
    { payee: 'Bob', amount: 20 },
    { payee: 'Alice', amount: 30 }
  ];

  const classifications = [
    {
      id: '1',
      payeeName: 'Alice',
      result: { classification: 'Business', confidence: 90, reasoning: '', processingTier: 'AI-Powered', sicCode: '', sicDescription: '' },
      timestamp: new Date()
    },
    {
      id: '2',
      payeeName: 'Bob',
      result: { classification: 'Individual', confidence: 80, reasoning: '', processingTier: 'AI-Powered', sicCode: '', sicDescription: '' },
      timestamp: new Date()
    }
  ];

  return { originalFileData, classifications };
}

describe('FileGenerationService.generateCSVContent', () => {
  it('preserves original row order and appends classification columns', () => {
    const { originalFileData, classifications } = createData();
    const csv = (FileGenerationService as any).generateCSVContent(classifications, originalFileData);
    const lines = csv.split('\n');

    expect(lines[0]).toContain('AI_Classification');
    expect(lines).toHaveLength(originalFileData.length + 1);

    const row1 = lines[1].slice(1, -1).split('\",\"');
    const row2 = lines[2].slice(1, -1).split('\",\"');
    const row3 = lines[3].slice(1, -1).split('\",\"');

    expect(row1[0]).toBe('Alice');
    expect(row2[0]).toBe('Bob');
    expect(row3[0]).toBe('Alice');

    expect(row1[2]).toBe('Business');
    expect(row2[2]).toBe('Individual');
  });
});
