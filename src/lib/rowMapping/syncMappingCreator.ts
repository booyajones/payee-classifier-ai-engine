
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
  
  // Step 3: Create unique name mappings using ORIGINAL names for duplicate detection
  // The duplicate detection engine should see all variants to properly analyze them
  const uniquePayeeNames: string[] = [];
  const uniqueNormalizedNames: string[] = [];
  const rowMappings: RowMapping[] = [];
  const payeeToIndexMap = new Map<string, number>();

  console.log(`[ROW MAPPING] Creating unique payee mapping using ORIGINAL names for proper duplicate detection...`);

  // Process EVERY single row to ensure complete mapping
  originalFileData.forEach((row, originalRowIndex) => {
    const standardizationResult = standardizationResults[originalRowIndex];
    const originalPayeeName = standardizationResult.original || `Unknown_Row_${originalRowIndex}`;
    const normalizedPayeeName = standardizationResult.normalized;
    
    // Use ORIGINAL name for uniqueness detection so duplicate detection can analyze all variants
    let uniquePayeeIndex = payeeToIndexMap.get(originalPayeeName);
    if (uniquePayeeIndex === undefined) {
      // This is a new unique payee (based on original name)
      uniquePayeeIndex = uniquePayeeNames.length;
      uniquePayeeNames.push(originalPayeeName); // Store original name for duplicate detection
      uniqueNormalizedNames.push(normalizedPayeeName); // Store normalized name for classification
      payeeToIndexMap.set(originalPayeeName, uniquePayeeIndex);
      
      console.log(`[ROW MAPPING] New unique payee ${uniquePayeeIndex}: "${originalPayeeName}" (normalized: "${normalizedPayeeName}")`);
    }

    // CRITICAL: Create mapping for EVERY row - no skipping
    rowMappings.push({
      originalRowIndex,
      payeeName: originalPayeeName,
      normalizedPayeeName: normalizedPayeeName,
      uniquePayeeIndex,
      standardizationResult
    });
    
    if (originalRowIndex < 10) {
      console.log(`[ROW MAPPING] Row ${originalRowIndex}: "${originalPayeeName}" → unique index ${uniquePayeeIndex} (normalized: "${normalizedPayeeName}")`);
    }
  });

  console.log(`[ROW MAPPING] ✅ Created ${uniquePayeeNames.length} unique payees from ${originalFileData.length} rows`);
  console.log(`[ROW MAPPING] First 5 unique payees:`, uniquePayeeNames.slice(0, 5));

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
