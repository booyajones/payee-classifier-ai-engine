
import { RowMapping, PayeeRowData } from './types';

/**
 * Shared validation and PayeeRowData creation logic
 */
export function validateAndCreatePayeeRowData(
  originalFileData: any[],
  uniquePayeeNames: string[],
  uniqueNormalizedNames: string[],
  rowMappings: RowMapping[],
  standardizationResults: any[],
  mode: 'SYNC' | 'ASYNC'
): PayeeRowData {
  // VALIDATION: Ensure we have a mapping for every original row
  if (rowMappings.length !== originalFileData.length) {
    console.error(`[ROW MAPPING ${mode}] CRITICAL ERROR: Row mapping failed - expected ${originalFileData.length} mappings, got ${rowMappings.length}`);
    throw new Error(`CRITICAL: Row mapping failed - expected ${originalFileData.length} mappings, got ${rowMappings.length}`);
  }

  // Validate no duplicate row indices
  const usedIndices = new Set<number>();
  for (const mapping of rowMappings) {
    if (usedIndices.has(mapping.originalRowIndex)) {
      console.error(`[ROW MAPPING ${mode}] DUPLICATE ORIGINAL ROW INDEX: ${mapping.originalRowIndex}`);
      throw new Error(`Duplicate original row index detected: ${mapping.originalRowIndex}`);
    }
    usedIndices.add(mapping.originalRowIndex);
  }

  // Calculate standardization statistics
  const changesDetected = standardizationResults.filter(r => r.original !== r.normalized).length;
  const allSteps = standardizationResults.flatMap(r => r.cleaningSteps);
  const averageStepsPerName = allSteps.length / standardizationResults.length;
  
  const stepCounts = allSteps.reduce((acc, step) => {
    acc[step] = (acc[step] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const mostCommonSteps = Object.entries(stepCounts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([step, count]) => ({ step, count: count as number }));

  const standardizationStats = {
    totalProcessed: standardizationResults.length,
    changesDetected,
    averageStepsPerName,
    mostCommonSteps
  };

  console.log(`[ROW MAPPING ${mode}] === MAPPING COMPLETE WITH ${mode} STANDARDIZATION ===`);
  console.log(`[ROW MAPPING ${mode}] ${originalFileData.length} original rows → ${uniquePayeeNames.length} unique payees → ${rowMappings.length} mappings`);
  console.log(`[ROW MAPPING ${mode}] Standardization: ${changesDetected}/${standardizationResults.length} names cleaned (${((changesDetected / standardizationResults.length) * 100).toFixed(1)}%)`);
  
  if (mode === 'SYNC') {
    console.log(`[ROW MAPPING] Most common cleaning steps:`, mostCommonSteps.slice(0, 3).map(s => s.step));
  }

  return {
    uniquePayeeNames,
    uniqueNormalizedNames,
    rowMappings,
    originalFileData,
    standardizationStats
  };
}
