
import { batchStandardizeNames } from '../dataStandardization';
import { RowMapping, PayeeRowData } from './types';
import { validateAndCreatePayeeRowData } from './validationUtils';

/**
 * Creates a mapping between original file rows and unique payee names
 * WITH COMPREHENSIVE DATA STANDARDIZATION (Synchronous version for backward compatibility)
 */
export function createPayeeRowMapping(
  originalFileData: any[],
  payeeColumnName: string
): PayeeRowData {
  console.log(`[ROW MAPPING] === CREATING PAYEE ROW MAPPING WITH STANDARDIZATION ===`);
  console.log(`[ROW MAPPING] Input: ${originalFileData.length} rows, payee column: "${payeeColumnName}"`);
  
  // Step 1: Extract all payee names for batch standardization
  const originalPayeeNames = originalFileData.map(row => row[payeeColumnName]);
  
  // Step 2: Perform comprehensive data standardization
  console.log(`[ROW MAPPING] Performing comprehensive data standardization...`);
  const standardizationResults = batchStandardizeNames(originalPayeeNames);
  
  // Step 3: Create unique name mappings using NORMALIZED names for deduplication
  const uniquePayeeNames: string[] = [];
  const uniqueNormalizedNames: string[] = [];
  const rowMappings: RowMapping[] = [];
  const payeeToIndexMap = new Map<string, number>();
  const normalizedToIndexMap = new Map<string, number>();

  // Process EVERY single row to ensure complete mapping
  originalFileData.forEach((row, originalRowIndex) => {
    const standardizationResult = standardizationResults[originalRowIndex];
    const originalPayeeName = standardizationResult.original || `Unknown_Row_${originalRowIndex}`;
    const normalizedPayeeName = standardizationResult.normalized;
    
    // Use NORMALIZED name for uniqueness detection
    let uniquePayeeIndex = normalizedToIndexMap.get(normalizedPayeeName);
    if (uniquePayeeIndex === undefined) {
      // This is a new unique payee (based on normalized name)
      uniquePayeeIndex = uniquePayeeNames.length;
      uniquePayeeNames.push(originalPayeeName); // Store original name for display
      uniqueNormalizedNames.push(normalizedPayeeName); // Store normalized name for processing
      payeeToIndexMap.set(originalPayeeName, uniquePayeeIndex);
      normalizedToIndexMap.set(normalizedPayeeName, uniquePayeeIndex);
      
      console.log(`[ROW MAPPING] New unique payee ${uniquePayeeIndex}: "${originalPayeeName}" → "${normalizedPayeeName}"`);
    }

    // CRITICAL: Create mapping for EVERY row - no skipping
    rowMappings.push({
      originalRowIndex,
      payeeName: originalPayeeName,
      normalizedPayeeName: normalizedPayeeName,
      uniquePayeeIndex,
      standardizationResult
    });
    
    if (originalRowIndex < 5) {
      console.log(`[ROW MAPPING] Row ${originalRowIndex}: "${originalPayeeName}" → "${normalizedPayeeName}" (unique index ${uniquePayeeIndex})`);
    }
  });

  // Validation and statistics calculations
  return validateAndCreatePayeeRowData(
    originalFileData,
    uniquePayeeNames,
    uniqueNormalizedNames,
    rowMappings,
    standardizationResults,
    'SYNC'
  );
}
