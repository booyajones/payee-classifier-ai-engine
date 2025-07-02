/**
 * Validation utilities for mapped result integrity
 */

/**
 * Validates mapped results and ensures data integrity
 */
export function validateMappedResults(
  mappedResults: any[],
  originalFileData: any[],
  processedRows: Set<number>,
  mode: 'SYNC' | 'ASYNC'
): any[] {
  // FINAL VALIDATION: Ensure no gaps in output
  for (let i = 0; i < mappedResults.length; i++) {
    if (!mappedResults[i]) {
      console.error(`[ROW MAPPING ${mode}] CRITICAL: Missing result at row ${i} - this should never happen`);
      throw new Error(`CRITICAL: Missing result at row ${i} - this should never happen`);
    }
  }

  // Validate all original rows were processed
  if (processedRows.size !== originalFileData.length) {
    console.error(`[ROW MAPPING ${mode}] Not all rows processed: ${processedRows.size}/${originalFileData.length}`);
    throw new Error(`Not all rows processed: ${processedRows.size}/${originalFileData.length}`);
  }

  // ABSOLUTE GUARANTEE CHECK
  if (mappedResults.length !== originalFileData.length) {
    console.error(`[ROW MAPPING ${mode}] CRITICAL FAILURE: Output length ${mappedResults.length} does not match input length ${originalFileData.length}`);
    throw new Error(`CRITICAL FAILURE: Output length ${mappedResults.length} does not match input length ${originalFileData.length}`);
  }

  console.log(`[ROW MAPPING ${mode}] === MAPPING SUCCESS WITH ${mode} STANDARDIZATION ===`);
  console.log(`[ROW MAPPING ${mode}] Mapped to exactly ${mappedResults.length} original rows`);
  
  if (mode === 'SYNC') {
    console.log(`[ROW MAPPING] Added standardization data: normalized_payee_name, standardization_steps, data_quality_improved`);
  }
  
  return mappedResults;
}