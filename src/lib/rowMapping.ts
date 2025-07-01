import { standardizePayeeName, batchStandardizeNames, batchStandardizeNamesAsync, DataStandardizationResult } from './dataStandardization';

export interface RowMapping {
  originalRowIndex: number;
  payeeName: string;
  normalizedPayeeName: string;
  uniquePayeeIndex: number;
  standardizationResult: DataStandardizationResult;
}

export interface PayeeRowData {
  uniquePayeeNames: string[];
  uniqueNormalizedNames: string[];
  rowMappings: RowMapping[];
  originalFileData: any[];
  standardizationStats: {
    totalProcessed: number;
    changesDetected: number;
    averageStepsPerName: number;
    mostCommonSteps: Array<{ step: string; count: number }>;
  };
}

/**
 * Creates a mapping between original file rows and unique payee names
 * WITH COMPREHENSIVE DATA STANDARDIZATION (Async version with progress)
 */
export async function createPayeeRowMappingAsync(
  originalFileData: any[],
  payeeColumnName: string,
  onProgress?: (processed: number, total: number, percentage: number) => void
): Promise<PayeeRowData> {
  console.log(`[ROW MAPPING ASYNC] === CREATING PAYEE ROW MAPPING WITH ASYNC STANDARDIZATION ===`);
  console.log(`[ROW MAPPING ASYNC] Input: ${originalFileData.length} rows, payee column: "${payeeColumnName}"`);
  
  // Step 1: Extract all payee names for batch standardization
  const originalPayeeNames = originalFileData.map(row => row[payeeColumnName]);
  
  // Step 2: Perform comprehensive data standardization with progress
  console.log(`[ROW MAPPING ASYNC] Performing comprehensive data standardization with chunked processing...`);
  const standardizationResults = await batchStandardizeNamesAsync(originalPayeeNames, onProgress);
  
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
      
      if (uniquePayeeIndex < 5) {
        console.log(`[ROW MAPPING ASYNC] New unique payee ${uniquePayeeIndex}: "${originalPayeeName}" → "${normalizedPayeeName}"`);
      }
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
      console.log(`[ROW MAPPING ASYNC] Row ${originalRowIndex}: "${originalPayeeName}" → "${normalizedPayeeName}" (unique index ${uniquePayeeIndex})`);
    }
  });

  // VALIDATION: Ensure we have a mapping for every original row
  if (rowMappings.length !== originalFileData.length) {
    console.error(`[ROW MAPPING ASYNC] CRITICAL ERROR: Row mapping failed - expected ${originalFileData.length} mappings, got ${rowMappings.length}`);
    throw new Error(`CRITICAL: Row mapping failed - expected ${originalFileData.length} mappings, got ${rowMappings.length}`);
  }

  // Validate no duplicate row indices
  const usedIndices = new Set<number>();
  for (const mapping of rowMappings) {
    if (usedIndices.has(mapping.originalRowIndex)) {
      console.error(`[ROW MAPPING ASYNC] DUPLICATE ORIGINAL ROW INDEX: ${mapping.originalRowIndex}`);
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
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([step, count]) => ({ step, count }));

  const standardizationStats = {
    totalProcessed: standardizationResults.length,
    changesDetected,
    averageStepsPerName,
    mostCommonSteps
  };

  console.log(`[ROW MAPPING ASYNC] === MAPPING COMPLETE WITH ASYNC STANDARDIZATION ===`);
  console.log(`[ROW MAPPING ASYNC] ${originalFileData.length} original rows → ${uniquePayeeNames.length} unique payees → ${rowMappings.length} mappings`);
  console.log(`[ROW MAPPING ASYNC] Standardization: ${changesDetected}/${standardizationResults.length} names cleaned (${(changesDetected/standardizationResults.length*100).toFixed(1)}%)`);

  return {
    uniquePayeeNames,
    uniqueNormalizedNames,
    rowMappings,
    originalFileData,
    standardizationStats
  };
}

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

  // VALIDATION: Ensure we have a mapping for every original row
  if (rowMappings.length !== originalFileData.length) {
    console.error(`[ROW MAPPING] CRITICAL ERROR: Row mapping failed - expected ${originalFileData.length} mappings, got ${rowMappings.length}`);
    throw new Error(`CRITICAL: Row mapping failed - expected ${originalFileData.length} mappings, got ${rowMappings.length}`);
  }

  // Validate no duplicate row indices
  const usedIndices = new Set<number>();
  for (const mapping of rowMappings) {
    if (usedIndices.has(mapping.originalRowIndex)) {
      console.error(`[ROW MAPPING] DUPLICATE ORIGINAL ROW INDEX: ${mapping.originalRowIndex}`);
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
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([step, count]) => ({ step, count }));

  const standardizationStats = {
    totalProcessed: standardizationResults.length,
    changesDetected,
    averageStepsPerName,
    mostCommonSteps
  };

  console.log(`[ROW MAPPING] === MAPPING COMPLETE WITH STANDARDIZATION ===`);
  console.log(`[ROW MAPPING] ${originalFileData.length} original rows → ${uniquePayeeNames.length} unique payees → ${rowMappings.length} mappings`);
  console.log(`[ROW MAPPING] Standardization: ${changesDetected}/${standardizationResults.length} names cleaned (${(changesDetected/standardizationResults.length*100).toFixed(1)}%)`);
  console.log(`[ROW MAPPING] Most common cleaning steps:`, mostCommonSteps.slice(0, 3).map(s => s.step));

  return {
    uniquePayeeNames,
    uniqueNormalizedNames,
    rowMappings,
    originalFileData,
    standardizationStats
  };
}

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
      mappedResults[originalRowIndex] = {
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
        
        // NEW: Standardization fields
        normalized_payee_name: mapping.normalizedPayeeName,
        original_payee_name: mapping.payeeName,
        standardization_steps: mapping.standardizationResult.cleaningSteps.join(', '),
        standardization_steps_count: mapping.standardizationResult.cleaningSteps.length,
        data_quality_improved: mapping.standardizationResult.original !== mapping.standardizationResult.normalized ? 'Yes' : 'No'
      };
      
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

  // FINAL VALIDATION: Ensure no gaps in output
  for (let i = 0; i < mappedResults.length; i++) {
    if (!mappedResults[i]) {
      console.error(`[ROW MAPPING ASYNC] CRITICAL: Missing result at row ${i} - this should never happen`);
      throw new Error(`CRITICAL: Missing result at row ${i} - this should never happen`);
    }
  }

  // Validate all original rows were processed
  if (processedRows.size !== originalFileData.length) {
    console.error(`[ROW MAPPING ASYNC] Not all rows processed: ${processedRows.size}/${originalFileData.length}`);
    throw new Error(`Not all rows processed: ${processedRows.size}/${originalFileData.length}`);
  }

  // ABSOLUTE GUARANTEE CHECK
  if (mappedResults.length !== originalFileData.length) {
    console.error(`[ROW MAPPING ASYNC] CRITICAL FAILURE: Output length ${mappedResults.length} does not match input length ${originalFileData.length}`);
    throw new Error(`CRITICAL FAILURE: Output length ${mappedResults.length} does not match input length ${originalFileData.length}`);
  }

  console.log(`[ROW MAPPING ASYNC] === MAPPING SUCCESS WITH ASYNC STANDARDIZATION ===`);
  console.log(`[ROW MAPPING ASYNC] ${classificationResults.length} unique results mapped to exactly ${mappedResults.length} original rows`);
  
  return mappedResults;
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
    mappedResults[originalRowIndex] = {
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
      
      // NEW: Standardization fields
      normalized_payee_name: mapping.normalizedPayeeName,
      original_payee_name: mapping.payeeName,
      standardization_steps: mapping.standardizationResult.cleaningSteps.join(', '),
      standardization_steps_count: mapping.standardizationResult.cleaningSteps.length,
      data_quality_improved: mapping.standardizationResult.original !== mapping.standardizationResult.normalized ? 'Yes' : 'No'
    };
    
    if (i < 3) {
      console.log(`[ROW MAPPING] Mapped row ${originalRowIndex}: "${mapping.payeeName}" → "${mapping.normalizedPayeeName}" (${mapping.standardizationResult.cleaningSteps.length} cleaning steps)`);
    }
  }

  // FINAL VALIDATION: Ensure no gaps in output
  for (let i = 0; i < mappedResults.length; i++) {
    if (!mappedResults[i]) {
      console.error(`[ROW MAPPING] CRITICAL: Missing result at row ${i} - this should never happen`);
      throw new Error(`CRITICAL: Missing result at row ${i} - this should never happen`);
    }
  }

  // Validate all original rows were processed
  if (processedRows.size !== originalFileData.length) {
    console.error(`[ROW MAPPING] Not all rows processed: ${processedRows.size}/${originalFileData.length}`);
    throw new Error(`Not all rows processed: ${processedRows.size}/${originalFileData.length}`);
  }

  // ABSOLUTE GUARANTEE CHECK
  if (mappedResults.length !== originalFileData.length) {
    console.error(`[ROW MAPPING] CRITICAL FAILURE: Output length ${mappedResults.length} does not match input length ${originalFileData.length}`);
    throw new Error(`CRITICAL FAILURE: Output length ${mappedResults.length} does not match input length ${originalFileData.length}`);
  }

  console.log(`[ROW MAPPING] === MAPPING SUCCESS WITH STANDARDIZATION ===`);
  console.log(`[ROW MAPPING] ${classificationResults.length} unique results mapped to exactly ${mappedResults.length} original rows`);
  console.log(`[ROW MAPPING] Added standardization data: normalized_payee_name, standardization_steps, data_quality_improved`);
  
  return mappedResults;
}
