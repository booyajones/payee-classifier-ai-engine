
import { PayeeClassification } from './types';

/**
 * Remove duplicate classifications based on various criteria
 */
export function deduplicateClassifications(
  classifications: PayeeClassification[]
): PayeeClassification[] {
  productionLogger.debug(`[DEDUP] Starting deduplication of ${classifications.length} classifications`);
  
  const seen = new Set<string>();
  const seenRowIndices = new Set<number>();
  const deduplicated: PayeeClassification[] = [];
  
  for (const classification of classifications) {
    // Check for duplicate IDs
    if (seen.has(classification.id)) {
      productionLogger.debug(`[DEDUP] Skipping duplicate ID: ${classification.id}`);
      continue;
    }
    
    // Check for duplicate row indices
    if (classification.rowIndex !== undefined && seenRowIndices.has(classification.rowIndex)) {
      productionLogger.debug(`[DEDUP] Skipping duplicate row index: ${classification.rowIndex}`);
      continue;
    }
    
    // Add to seen sets
    seen.add(classification.id);
    if (classification.rowIndex !== undefined) {
      seenRowIndices.add(classification.rowIndex);
    }
    
    deduplicated.push(classification);
  }
  
  productionLogger.debug(`[DEDUP] Deduplicated from ${classifications.length} to ${deduplicated.length} classifications`);
  return deduplicated;
}

/**
 * Validate that classifications have no duplicates and are properly sequenced
 */
export function validateClassificationIntegrity(
  classifications: PayeeClassification[],
  expectedCount: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check count
  if (classifications.length !== expectedCount) {
    errors.push(`Expected ${expectedCount} classifications, got ${classifications.length}`);
  }
  
  // Check for duplicate IDs
  const ids = classifications.map(c => c.id);
  const uniqueIds = new Set(ids);
  if (ids.length !== uniqueIds.size) {
    errors.push(`Found ${ids.length - uniqueIds.size} duplicate IDs`);
  }
  
  // Check for duplicate row indices
  const rowIndices = classifications.map(c => c.rowIndex).filter(idx => idx !== undefined);
  const uniqueRowIndices = new Set(rowIndices);
  if (rowIndices.length !== uniqueRowIndices.size) {
    errors.push(`Found ${rowIndices.length - uniqueRowIndices.size} duplicate row indices`);
  }
  
  // Check for proper sequence (0 to expectedCount-1)
  if (rowIndices.length === expectedCount) {
    const sortedIndices = [...rowIndices].sort((a, b) => a - b);
    for (let i = 0; i < expectedCount; i++) {
      if (sortedIndices[i] !== i) {
        errors.push(`Missing or incorrect row index at position ${i}`);
        break;
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
