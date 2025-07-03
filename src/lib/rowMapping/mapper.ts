/**
 * Core result mapping functionality
 */

import { processInChunks } from '../performance/chunkProcessor';
import { PayeeRowData } from './types';
import { createMappedRow } from './rowCreator';
import { validateMappedResults } from './validator';

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
  productionLogger.debug(`[ROW MAPPING ASYNC] === MAPPING RESULTS TO ORIGINAL ROWS WITH ASYNC PROCESSING ===`);
  const { originalFileData, rowMappings, uniquePayeeNames, uniqueNormalizedNames } = payeeRowData;
  
  productionLogger.debug(`[ROW MAPPING ASYNC] Input validation:`, {
    classificationResultsLength: classificationResults.length,
    uniquePayeeNamesLength: uniquePayeeNames.length,
    uniqueNormalizedNamesLength: uniqueNormalizedNames.length,
    originalFileDataLength: originalFileData.length,
    rowMappingsLength: rowMappings.length
  });
  
  // Validate inputs
  if (classificationResults.length !== uniquePayeeNames.length) {
    productionLogger.error(`[ROW MAPPING ASYNC] Classification results mismatch: expected ${uniquePayeeNames.length} unique payees, got ${classificationResults.length}`);
    throw new Error(`Classification results mismatch: expected ${uniquePayeeNames.length} unique payees, got ${classificationResults.length}`);
  }

  if (rowMappings.length !== originalFileData.length) {
    productionLogger.error(`[ROW MAPPING ASYNC] Row mapping mismatch: expected ${originalFileData.length} mappings, got ${rowMappings.length}`);
    throw new Error(`Row mapping mismatch: expected ${originalFileData.length} mappings, got ${rowMappings.length}`);
  }

  // Initialize output array with EXACT original file length
  const mappedResults = new Array(originalFileData.length);
  const processedRows = new Set<number>();
  
  productionLogger.debug(`[ROW MAPPING ASYNC] Processing ${rowMappings.length} mappings with async processing...`);
  
  // Process mappings in chunks to prevent blocking
  await processInChunks(
    rowMappings,
    (mapping, i) => {
      const originalRowIndex = mapping.originalRowIndex;
      
      // Prevent duplicate processing of the same row
      if (processedRows.has(originalRowIndex)) {
        productionLogger.error(`[ROW MAPPING ASYNC] DUPLICATE ROW PROCESSING: ${originalRowIndex}`);
        throw new Error(`Duplicate row processing detected: ${originalRowIndex}`);
      }
      processedRows.add(originalRowIndex);
      
      const originalRow = originalFileData[originalRowIndex];
      const classificationResult = classificationResults[mapping.uniquePayeeIndex];
      
      if (!originalRow) {
        productionLogger.error(`[ROW MAPPING ASYNC] Missing original row at index ${originalRowIndex}`);
        throw new Error(`Missing original row at index ${originalRowIndex}`);
      }
      
      if (!classificationResult) {
        productionLogger.error(`[ROW MAPPING ASYNC] Missing classification result for unique payee index ${mapping.uniquePayeeIndex}`);
        throw new Error(`Missing classification result for unique payee index ${mapping.uniquePayeeIndex}`);
      }
      
      // Create the mapped row with original data + classification + STANDARDIZATION DATA
      mappedResults[originalRowIndex] = createMappedRow(originalRow, classificationResult, mapping, payeeRowData);
      
      if (i < 3) {
        productionLogger.debug(`[ROW MAPPING ASYNC] Mapped row ${originalRowIndex}: "${mapping.payeeName}" → "${mapping.normalizedPayeeName}" (${mapping.standardizationResult.cleaningSteps.length} cleaning steps)`);
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
  productionLogger.debug(`[ROW MAPPING] === MAPPING RESULTS TO ORIGINAL ROWS WITH STANDARDIZATION ===`);
  const { originalFileData, rowMappings, uniquePayeeNames, uniqueNormalizedNames } = payeeRowData;
  
  productionLogger.debug(`[ROW MAPPING] Input validation:`, {
    classificationResultsLength: classificationResults.length,
    uniquePayeeNamesLength: uniquePayeeNames.length,
    uniqueNormalizedNamesLength: uniqueNormalizedNames.length,
    originalFileDataLength: originalFileData.length,
    rowMappingsLength: rowMappings.length
  });
  
  // Validate inputs
  if (classificationResults.length !== uniquePayeeNames.length) {
    productionLogger.error(`[ROW MAPPING] Classification results mismatch: expected ${uniquePayeeNames.length} unique payees, got ${classificationResults.length}`);
    throw new Error(`Classification results mismatch: expected ${uniquePayeeNames.length} unique payees, got ${classificationResults.length}`);
  }

  if (rowMappings.length !== originalFileData.length) {
    productionLogger.error(`[ROW MAPPING] Row mapping mismatch: expected ${originalFileData.length} mappings, got ${rowMappings.length}`);
    throw new Error(`Row mapping mismatch: expected ${originalFileData.length} mappings, got ${rowMappings.length}`);
  }

  // Initialize output array with EXACT original file length
  const mappedResults = new Array(originalFileData.length);
  const processedRows = new Set<number>();
  
  productionLogger.debug(`[ROW MAPPING] Processing ${rowMappings.length} mappings with standardization data...`);
  
  // Process EVERY mapping to ensure EVERY original row gets a result
  for (let i = 0; i < rowMappings.length; i++) {
    const mapping = rowMappings[i];
    const originalRowIndex = mapping.originalRowIndex;
    
    // Prevent duplicate processing of the same row
    if (processedRows.has(originalRowIndex)) {
      productionLogger.error(`[ROW MAPPING] DUPLICATE ROW PROCESSING: ${originalRowIndex}`);
      throw new Error(`Duplicate row processing detected: ${originalRowIndex}`);
    }
    processedRows.add(originalRowIndex);
    
    const originalRow = originalFileData[originalRowIndex];
    const classificationResult = classificationResults[mapping.uniquePayeeIndex];
    
    if (!originalRow) {
      productionLogger.error(`[ROW MAPPING] Missing original row at index ${originalRowIndex}`);
      throw new Error(`Missing original row at index ${originalRowIndex}`);
    }
    
    if (!classificationResult) {
      productionLogger.error(`[ROW MAPPING] Missing classification result for unique payee index ${mapping.uniquePayeeIndex}`);
      throw new Error(`Missing classification result for unique payee index ${mapping.uniquePayeeIndex}`);
    }
    
    // Create the mapped row with original data + classification + STANDARDIZATION DATA
    mappedResults[originalRowIndex] = createMappedRow(originalRow, classificationResult, mapping, payeeRowData);
    
    if (i < 3) {
      productionLogger.debug(`[ROW MAPPING] Mapped row ${originalRowIndex}: "${mapping.payeeName}" → "${mapping.normalizedPayeeName}" (${mapping.standardizationResult.cleaningSteps.length} cleaning steps)`);
    }
  }

  return validateMappedResults(mappedResults, originalFileData, processedRows, 'SYNC');
}
