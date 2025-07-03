import { describe, it, expect } from 'vitest';
import { FileGenerationService } from '../fileGenerationService';

function createClassification(id: string, name: string) {
  return {
    id,
    payeeName: name,
    result: {
      classification: 'Business',
      confidence: 90,
      reasoning: 'ok',
      processingTier: 'AI',
      processingMethod: 'test',
    },
    timestamp: new Date(),
  } as any;
}

describe('FileGenerationService.generateCSVContent', () => {
  it('preserves row count with duplicate payees', () => {
    const classifications = [
      createClassification('1', 'Alice'),
      createClassification('2', 'Bob'),
    ];
    const originalFileData = [
      { Payee: 'Alice', Amount: 100 },
      { Payee: 'Bob', Amount: 200 },
      { Payee: 'Alice', Amount: 300 },
    ];
    const rowMappings = [
      {
        originalRowIndex: 0,
        payeeName: 'Alice',
        normalizedPayeeName: 'alice',
        uniquePayeeIndex: 0,
        standardizationResult: { original: 'Alice', normalized: 'alice', cleaningSteps: [] },
      },
      {
        originalRowIndex: 1,
        payeeName: 'Bob',
        normalizedPayeeName: 'bob',
        uniquePayeeIndex: 1,
        standardizationResult: { original: 'Bob', normalized: 'bob', cleaningSteps: [] },
      },
      {
        originalRowIndex: 2,
        payeeName: 'Alice',
        normalizedPayeeName: 'alice',
        uniquePayeeIndex: 0,
        standardizationResult: { original: 'Alice', normalized: 'alice', cleaningSteps: [] },
      },
    ];

    const csv = (FileGenerationService as any).generateCSVContent(
      classifications,
      originalFileData,
      rowMappings
    );

    const rows = csv.trim().split('\n');
    expect(rows.length).toBe(4); // header + 3 data rows
  });
});
