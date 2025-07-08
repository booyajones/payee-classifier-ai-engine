import { describe, it, expect } from 'vitest';
import { mapResultsToOriginalRows } from '../mapper';

function createPayeeRowData() {
  const originalFileData = [
    { payee: 'Alice', amount: 10 },
    { payee: 'Bob', amount: 20 },
    { payee: 'Alice', amount: 30 }
  ];

  const rowMappings = [
    {
      originalRowIndex: 0,
      payeeName: 'Alice',
      normalizedPayeeName: 'alice',
      uniquePayeeIndex: 0,
      standardizationResult: { original: 'Alice', normalized: 'alice', cleaningSteps: [] }
    },
    {
      originalRowIndex: 1,
      payeeName: 'Bob',
      normalizedPayeeName: 'bob',
      uniquePayeeIndex: 1,
      standardizationResult: { original: 'Bob', normalized: 'bob', cleaningSteps: [] }
    },
    {
      originalRowIndex: 2,
      payeeName: 'Alice',
      normalizedPayeeName: 'alice',
      uniquePayeeIndex: 0,
      standardizationResult: { original: 'Alice', normalized: 'alice', cleaningSteps: [] }
    }
  ];

  const uniquePayeeNames = ['Alice', 'Bob'];
  const uniqueNormalizedNames = ['alice', 'bob'];

  return {
    uniquePayeeNames,
    uniqueNormalizedNames,
    rowMappings,
    originalFileData,
    standardizationStats: {
      totalProcessed: 3,
      changesDetected: 0,
      averageStepsPerName: 0,
      mostCommonSteps: []
    }
  };
}

function createClassifications() {
  return [
    {
      id: '1',
      payeeName: 'Alice',
      result: { classification: 'Business', confidence: 90, reasoning: '', processingTier: 'AI-Powered' },
      timestamp: new Date()
    },
    {
      id: '2',
      payeeName: 'Bob',
      result: { classification: 'Individual', confidence: 80, reasoning: '', processingTier: 'AI-Powered' },
      timestamp: new Date()
    }
  ];
}

describe('mapResultsToOriginalRows', () => {
  it('returns mapped results matching original file length', () => {
    const payeeRowData = createPayeeRowData();
    const classifications = createClassifications();
    const mapped = mapResultsToOriginalRows(classifications, payeeRowData as any);
    expect(mapped).toHaveLength(payeeRowData.originalFileData.length);
  });
});
