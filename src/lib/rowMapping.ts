
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

  // Process each row to build the mapping
  originalFileData.forEach((row, originalRowIndex) => {
    const payeeName = row[payeeColumnName];
    
    if (!payeeName || typeof payeeName !== 'string' || payeeName.trim() === '') {
      return; // Skip invalid payee names
    }

    const cleanedPayeeName = payeeName.trim();
    
    // Get or create unique payee index
    let uniquePayeeIndex = payeeToIndexMap.get(cleanedPayeeName);
    if (uniquePayeeIndex === undefined) {
      uniquePayeeIndex = uniquePayeeNames.length;
      uniquePayeeNames.push(cleanedPayeeName);
      payeeToIndexMap.set(cleanedPayeeName, uniquePayeeIndex);
    }

    // Create mapping for this row
    rowMappings.push({
      originalRowIndex,
      payeeName: cleanedPayeeName,
      uniquePayeeIndex
    });
  });

  console.log(`[ROW MAPPING] Created mapping: ${originalFileData.length} original rows -> ${uniquePayeeNames.length} unique payees -> ${rowMappings.length} valid mappings`);

  return {
    uniquePayeeNames,
    rowMappings,
    originalFileData
  };
}

/**
 * Maps classification results back to original file structure
 * FIXED: Now correctly handles the mapping from unique payee results to all original rows
 */
export function mapResultsToOriginalRows(
  classificationResults: any[],
  payeeRowData: PayeeRowData
): any[] {
  const { originalFileData, rowMappings, uniquePayeeNames } = payeeRowData;
  
  // FIXED: Check that classification results match unique payee count, not original file length
  if (classificationResults.length !== uniquePayeeNames.length) {
    throw new Error(`Classification results mismatch: expected ${uniquePayeeNames.length} unique payees, got ${classificationResults.length}`);
  }

  // Create output array with same length as original file
  const mappedResults = new Array(originalFileData.length);
  
  // Fill with original data first
  originalFileData.forEach((row, index) => {
    mappedResults[index] = { ...row };
  });

  // FIXED: Apply classification results using the mapping correctly
  rowMappings.forEach(mapping => {
    const classificationResult = classificationResults[mapping.uniquePayeeIndex];
    if (classificationResult) {
      // Add classification fields to the original row
      mappedResults[mapping.originalRowIndex] = {
        ...mappedResults[mapping.originalRowIndex],
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
  });

  console.log(`[ROW MAPPING] Successfully mapped ${classificationResults.length} unique payee results to ${mappedResults.length} original rows`);
  
  return mappedResults;
}
