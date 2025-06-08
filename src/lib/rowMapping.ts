
export interface RowMapping {
  originalRowIndex: number;
  payeeName: string;
  uniquePayeeIndex: number;
}

export interface PayeeRowData {
  uniquePayeeNames: string[];
  rowMappings: RowMapping[];
  originalFileData: any[];
}

/**
 * Creates a mapping between original file rows and unique payee names
 */
export function createPayeeRowMapping(
  originalFileData: any[],
  payeeColumnName: string
): PayeeRowData {
  const uniquePayeeNames: string[] = [];
  const rowMappings: RowMapping[] = [];
  const payeeToIndexMap = new Map<string, number>();

  // Process EVERY single row to ensure complete mapping
  originalFileData.forEach((row, originalRowIndex) => {
    const payeeName = row[payeeColumnName];
    
    // Handle missing/invalid payee names with fallback
    const cleanedPayeeName = payeeName && typeof payeeName === 'string' && payeeName.trim() !== '' 
      ? payeeName.trim() 
      : `Unknown_Row_${originalRowIndex}`;
    
    // Get or create unique payee index
    let uniquePayeeIndex = payeeToIndexMap.get(cleanedPayeeName);
    if (uniquePayeeIndex === undefined) {
      uniquePayeeIndex = uniquePayeeNames.length;
      uniquePayeeNames.push(cleanedPayeeName);
      payeeToIndexMap.set(cleanedPayeeName, uniquePayeeIndex);
    }

    // CRITICAL: Create mapping for EVERY row - no skipping
    rowMappings.push({
      originalRowIndex,
      payeeName: cleanedPayeeName,
      uniquePayeeIndex
    });
  });

  // VALIDATION: Ensure we have a mapping for every original row
  if (rowMappings.length !== originalFileData.length) {
    throw new Error(`CRITICAL: Row mapping failed - expected ${originalFileData.length} mappings, got ${rowMappings.length}`);
  }

  console.log(`[ROW MAPPING] GUARANTEED ALIGNMENT: ${originalFileData.length} original rows -> ${uniquePayeeNames.length} unique payees -> ${rowMappings.length} mappings`);

  return {
    uniquePayeeNames,
    rowMappings,
    originalFileData
  };
}

/**
 * Maps classification results back to original file structure
 * ABSOLUTE GUARANTEE: Output length = Original file length
 */
export function mapResultsToOriginalRows(
  classificationResults: any[],
  payeeRowData: PayeeRowData
): any[] {
  const { originalFileData, rowMappings, uniquePayeeNames } = payeeRowData;
  
  // Validate inputs
  if (classificationResults.length !== uniquePayeeNames.length) {
    throw new Error(`Classification results mismatch: expected ${uniquePayeeNames.length} unique payees, got ${classificationResults.length}`);
  }

  if (rowMappings.length !== originalFileData.length) {
    throw new Error(`Row mapping mismatch: expected ${originalFileData.length} mappings, got ${rowMappings.length}`);
  }

  // Initialize output array with EXACT original file length
  const mappedResults = new Array(originalFileData.length);
  
  // Process EVERY mapping to ensure EVERY original row gets a result
  for (let i = 0; i < rowMappings.length; i++) {
    const mapping = rowMappings[i];
    const originalRow = originalFileData[mapping.originalRowIndex];
    const classificationResult = classificationResults[mapping.uniquePayeeIndex];
    
    if (!originalRow) {
      throw new Error(`Missing original row at index ${mapping.originalRowIndex}`);
    }
    
    if (!classificationResult) {
      throw new Error(`Missing classification result for unique payee index ${mapping.uniquePayeeIndex}`);
    }
    
    // Create the mapped row with original data + classification
    mappedResults[mapping.originalRowIndex] = {
      ...originalRow,
      classification: classificationResult.result?.classification || 'Individual',
      confidence: classificationResult.result?.confidence || 50,
      reasoning: classificationResult.result?.reasoning || 'No classification result',
      processingTier: classificationResult.result?.processingTier || 'Failed',
      processingMethod: classificationResult.result?.processingMethod || 'Unknown',
      keywordExclusion: classificationResult.result?.keywordExclusion?.isExcluded ? 'Yes' : 'No',
      matchedKeywords: classificationResult.result?.keywordExclusion?.matchedKeywords?.join('; ') || '',
      keywordConfidence: classificationResult.result?.keywordExclusion?.confidence?.toString() || '0',
      keywordReasoning: classificationResult.result?.keywordExclusion?.reasoning || 'No keyword exclusion applied',
      timestamp: classificationResult.timestamp instanceof Date ? classificationResult.timestamp.toISOString() : new Date().toISOString()
    };
  }

  // FINAL VALIDATION: Ensure no gaps in output
  for (let i = 0; i < mappedResults.length; i++) {
    if (!mappedResults[i]) {
      throw new Error(`CRITICAL: Missing result at row ${i} - this should never happen`);
    }
  }

  // ABSOLUTE GUARANTEE CHECK
  if (mappedResults.length !== originalFileData.length) {
    throw new Error(`CRITICAL FAILURE: Output length ${mappedResults.length} does not match input length ${originalFileData.length}`);
  }

  console.log(`[ROW MAPPING] ABSOLUTE SUCCESS: ${classificationResults.length} unique results mapped to exactly ${mappedResults.length} original rows`);
  
  return mappedResults;
}
