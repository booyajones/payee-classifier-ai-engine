
import { processInChunks } from '../performance/chunkProcessor';
import { PayeeRowData } from './types';

/**
 * Maps classification results back to original file structure with chunked processing
 * ABSOLUTE GUARANTEE: Output length = Original file length
 * NOW WITH NORMALIZED PAYEE NAMES (Async version)
 */
export async function mapResultsToOriginalRowsAsync(
  classificationResults: any[],
  payeeRowData: PayeeRowData,
  onProgress?: (processed: number, total: number, percentage: number) => void
): Promise<any[]> {
  console.log(`[ROW MAPPING ASYNC] === MAPPING RESULTS TO ORIGINAL ROWS WITH ASYNC PROCESSING ===`);
  const { originalFileData, rowMappings, uniquePayeeNames, uniqueNormalizedNames } = payeeRowData;
  
  console.log(`[ROW MAPPING ASYNC] Input validation:`, {
    classificationResultsLength: classificationResults.length,
    uniquePayeeNamesLength: uniquePayeeNames.length,
    uniqueNormalizedNamesLength: uniqueNormalizedNames.length,
    originalFileDataLength: originalFileData.length,
    rowMappingsLength: rowMappings.length
  });
  
  // Validate inputs
  if (classificationResults.length !== uniquePayeeNames.length) {
    console.error(`[ROW MAPPING ASYNC] Classification results mismatch: expected ${uniquePayeeNames.length} unique payees, got ${classificationResults.length}`);
    throw new Error(`Classification results mismatch: expected ${uniquePayeeNames.length} unique payees, got ${classificationResults.length}`);
  }

  if (rowMappings.length !== originalFileData.length) {
    console.error(`[ROW MAPPING ASYNC] Row mapping mismatch: expected ${originalFileData.length} mappings, got ${rowMappings.length}`);
    throw new Error(`Row mapping mismatch: expected ${originalFileData.length} mappings, got ${rowMappings.length}`);
  }

  // Initialize output array with EXACT original file length
  const mappedResults = new Array(originalFileData.length);
  const processedRows = new Set<number>();
  
  console.log(`[ROW MAPPING ASYNC] Processing ${rowMappings.length} mappings with async processing...`);
  
  // Process mappings in chunks to prevent blocking
  await processInChunks(
    rowMappings,
    (mapping, i) => {
      const originalRowIndex = mapping.originalRowIndex;
      
      // Prevent duplicate processing of the same row
      if (processedRows.has(originalRowIndex)) {
        console.error(`[ROW MAPPING ASYNC] DUPLICATE ROW PROCESSING: ${originalRowIndex}`);
        throw new Error(`Duplicate row processing detected: ${originalRowIndex}`);
      }
      processedRows.add(originalRowIndex);
      
      const originalRow = originalFileData[originalRowIndex];
      const classificationResult = classificationResults[mapping.uniquePayeeIndex];
      
      if (!originalRow) {
        console.error(`[ROW MAPPING ASYNC] Missing original row at index ${originalRowIndex}`);
        throw new Error(`Missing original row at index ${originalRowIndex}`);
      }
      
      if (!classificationResult) {
        console.error(`[ROW MAPPING ASYNC] Missing classification result for unique payee index ${mapping.uniquePayeeIndex}`);
        throw new Error(`Missing classification result for unique payee index ${mapping.uniquePayeeIndex}`);
      }
      
      // Create the mapped row with original data + classification + STANDARDIZATION DATA
      mappedResults[originalRowIndex] = createMappedRow(originalRow, classificationResult, mapping);
      
      if (i < 3) {
        console.log(`[ROW MAPPING ASYNC] Mapped row ${originalRowIndex}: "${mapping.payeeName}" → "${mapping.normalizedPayeeName}" (${mapping.standardizationResult.cleaningSteps.length} cleaning steps)`);
      }
    },
    {
      chunkSize: originalFileData.length > 10000 ? 500 : 250,
      delayMs: originalFileData.length > 5000 ? 15 : 10,
      onProgress: onProgress
    }
  );

  return validateMappedResults(mappedResults, originalFileData, processedRows, 'ASYNC');
}

/**
 * Maps classification results back to original file structure
 * ABSOLUTE GUARANTEE: Output length = Original file length
 * NOW WITH NORMALIZED PAYEE NAMES (Synchronous version for backward compatibility)
 */
export function mapResultsToOriginalRows(
  classificationResults: any[],
  payeeRowData: PayeeRowData
): any[] {
  console.log(`[ROW MAPPING] === MAPPING RESULTS TO ORIGINAL ROWS WITH STANDARDIZATION ===`);
  const { originalFileData, rowMappings, uniquePayeeNames, uniqueNormalizedNames } = payeeRowData;
  
  console.log(`[ROW MAPPING] Input validation:`, {
    classificationResultsLength: classificationResults.length,
    uniquePayeeNamesLength: uniquePayeeNames.length,
    uniqueNormalizedNamesLength: uniqueNormalizedNames.length,
    originalFileDataLength: originalFileData.length,
    rowMappingsLength: rowMappings.length
  });
  
  // Validate inputs
  if (classificationResults.length !== uniquePayeeNames.length) {
    console.error(`[ROW MAPPING] Classification results mismatch: expected ${uniquePayeeNames.length} unique payees, got ${classificationResults.length}`);
    throw new Error(`Classification results mismatch: expected ${uniquePayeeNames.length} unique payees, got ${classificationResults.length}`);
  }

  if (rowMappings.length !== originalFileData.length) {
    console.error(`[ROW MAPPING] Row mapping mismatch: expected ${originalFileData.length} mappings, got ${rowMappings.length}`);
    throw new Error(`Row mapping mismatch: expected ${originalFileData.length} mappings, got ${rowMappings.length}`);
  }

  // Initialize output array with EXACT original file length
  const mappedResults = new Array(originalFileData.length);
  const processedRows = new Set<number>();
  
  console.log(`[ROW MAPPING] Processing ${rowMappings.length} mappings with standardization data...`);
  
  // Process EVERY mapping to ensure EVERY original row gets a result
  for (let i = 0; i < rowMappings.length; i++) {
    const mapping = rowMappings[i];
    const originalRowIndex = mapping.originalRowIndex;
    
    // Prevent duplicate processing of the same row
    if (processedRows.has(originalRowIndex)) {
      console.error(`[ROW MAPPING] DUPLICATE ROW PROCESSING: ${originalRowIndex}`);
      throw new Error(`Duplicate row processing detected: ${originalRowIndex}`);
    }
    processedRows.add(originalRowIndex);
    
    const originalRow = originalFileData[originalRowIndex];
    const classificationResult = classificationResults[mapping.uniquePayeeIndex];
    
    if (!originalRow) {
      console.error(`[ROW MAPPING] Missing original row at index ${originalRowIndex}`);
      throw new Error(`Missing original row at index ${originalRowIndex}`);
    }
    
    if (!classificationResult) {
      console.error(`[ROW MAPPING] Missing classification result for unique payee index ${mapping.uniquePayeeIndex}`);
      throw new Error(`Missing classification result for unique payee index ${mapping.uniquePayeeIndex}`);
    }
    
    // Create the mapped row with original data + classification + STANDARDIZATION DATA
    mappedResults[originalRowIndex] = createMappedRow(originalRow, classificationResult, mapping);
    
    if (i < 3) {
      console.log(`[ROW MAPPING] Mapped row ${originalRowIndex}: "${mapping.payeeName}" → "${mapping.normalizedPayeeName}" (${mapping.standardizationResult.cleaningSteps.length} cleaning steps)`);
    }
  }

  return validateMappedResults(mappedResults, originalFileData, processedRows, 'SYNC');
}

/**
 * Creates a mapped row with all necessary data
 */
function createMappedRow(originalRow: any, classificationResult: any, mapping: any): any {
  return {
    ...originalRow,
    // Original classification fields
    classification: classificationResult.result?.classification || 'Individual',
    confidence: classificationResult.result?.confidence || 50,
    reasoning: classificationResult.result?.reasoning || 'No classification result',
    processingTier: classificationResult.result?.processingTier || 'Failed',
    processingMethod: classificationResult.result?.processingMethod || 'Unknown',
    keywordExclusion: classificationResult.result?.keywordExclusion?.isExcluded ? 'Yes' : 'No',
    matchedKeywords: classificationResult.result?.keywordExclusion?.matchedKeywords?.join('; ') || '',
    keywordConfidence: classificationResult.result?.keywordExclusion?.confidence?.toString() || '0',
    keywordReasoning: classificationResult.result?.keywordExclusion?.reasoning || 'No keyword exclusion applied',
    timestamp: classificationResult.timestamp instanceof Date ? classificationResult.timestamp.toISOString() : new Date().toISOString(),
    
    // SIC code fields
    sicCode: classificationResult.result?.sicCode || '',
    sicDescription: classificationResult.result?.sicDescription || '',
    
    // NEW: Standardization fields
    normalized_payee_name: mapping.normalizedPayeeName,
    original_payee_name: mapping.payeeName,
    standardization_steps: mapping.standardizationResult.cleaningSteps.join(', '),
    standardization_steps_count: mapping.standardizationResult.cleaningSteps.length,
    data_quality_improved: mapping.standardizationResult.original !== mapping.standardizationResult.normalized ? 'Yes' : 'No'
  };
}

/**
 * Validates mapped results and ensures data integrity
 */
function validateMappedResults(
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
