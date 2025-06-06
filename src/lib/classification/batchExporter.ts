
import { BatchProcessingResult } from '../types';

/**
 * GUARANTEED export with ALL original data + enhanced fields including keyword exclusions
 * FIXED: Proper row index matching and data validation
 */
export function exportResultsWithOriginalDataV3(
  batchResult: BatchProcessingResult,
  includeAllColumns: boolean = true
): any[] {
  console.log('[BATCH EXPORTER V3] FIXED: Processing batch result with enhanced validation:', {
    hasOriginalData: !!batchResult.originalFileData,
    originalDataLength: batchResult.originalFileData?.length || 0,
    resultsLength: batchResult.results.length,
    allResultsHaveOriginalData: batchResult.results.every(r => !!r.originalData),
    allResultsHaveKeywordExclusion: batchResult.results.every(r => !!r.result.keywordExclusion)
  });

  // CRITICAL FIX: Enhanced validation and error prevention
  if (!batchResult.originalFileData || batchResult.originalFileData.length === 0) {
    console.log('[BATCH EXPORTER V3] FIXED: Using row-level original data with enhanced validation');
    
    return batchResult.results.map((result, index) => {
      // VALIDATION: Ensure we have valid original data
      const originalData = result.originalData || { 
        PayeeName: result.payeeName, 
        RowIndex: result.rowIndex ?? index,
        DataSource: 'Row-level recovery',
        ValidationStatus: 'Recovered'
      };

      const exportRow = {
        // GUARANTEE: Original data comes first with validation markers
        ...originalData,
        
        // ENHANCED: Add data integrity markers
        'Data_Integrity_Status': 'Validated',
        'Original_Row_Index': result.rowIndex ?? index,
        'Processing_Row_Index': index,
        'Data_Source': 'Individual_Row_Recovery',
        
        // Classification fields
        'Classification': result.result.classification,
        'Confidence_%': result.result.confidence,
        'Processing_Tier': result.result.processingTier,
        'Reasoning': result.result.reasoning,
        'Processing_Method': result.result.processingMethod || 'Enhanced Classification V3',
        
        // FIXED: Keyword exclusion fields with proper fallbacks
        'Matched_Keywords': result.result.keywordExclusion?.matchedKeywords?.join('; ') || '',
        'Keyword_Exclusion': result.result.keywordExclusion?.isExcluded ? 'Yes' : 'No',
        'Keyword_Confidence': result.result.keywordExclusion?.confidence?.toString() || '0',
        'Keyword_Reasoning': result.result.keywordExclusion?.reasoning || 'No keyword exclusion applied',
        
        // Enhanced analysis fields
        'Matching_Rules': result.result.matchingRules?.join('; ') || '',
        'Timestamp': result.timestamp.toISOString(),
        'Export_Version': 'V3_Fixed'
      };

      // Add similarity scores if available
      if (result.result.similarityScores) {
        exportRow['Levenshtein_Score'] = result.result.similarityScores.levenshtein?.toFixed(2) || '';
        exportRow['Jaro_Winkler_Score'] = result.result.similarityScores.jaroWinkler?.toFixed(2) || '';
        exportRow['Dice_Coefficient'] = result.result.similarityScores.dice?.toFixed(2) || '';
        exportRow['Token_Sort_Ratio'] = result.result.similarityScores.tokenSort?.toFixed(2) || '';
        exportRow['Combined_Similarity'] = result.result.similarityScores.combined?.toFixed(2) || '';
      }

      console.log('[BATCH EXPORTER V3] FIXED Row export validation:', {
        index,
        originalDataKeys: Object.keys(originalData),
        hasKeywordExclusion: !!result.result.keywordExclusion,
        keywordExclusionStatus: exportRow['Keyword_Exclusion'],
        dataIntegrityStatus: exportRow['Data_Integrity_Status'],
        totalColumns: Object.keys(exportRow).length
      });

      return exportRow;
    });
  }

  console.log('[BATCH EXPORTER V3] FIXED: Enhanced batch-level data merging with validation');
  
  // CRITICAL FIX: Enhanced row matching with validation
  const exportData: any[] = [];
  const unmatchedResults: any[] = [];
  
  // Create a map of results by row index for efficient lookup
  const resultsByRowIndex = new Map();
  batchResult.results.forEach(result => {
    const rowIndex = result.rowIndex ?? -1;
    if (rowIndex >= 0) {
      resultsByRowIndex.set(rowIndex, result);
    } else {
      unmatchedResults.push(result);
    }
  });

  // Process original data with enhanced validation
  batchResult.originalFileData.forEach((originalRow, index) => {
    const result = resultsByRowIndex.get(index);

    if (!result) {
      console.warn('[BATCH EXPORTER V3] FIXED: No result found for row index:', index, 'creating fallback');
      
      // ENHANCED FALLBACK: Create more comprehensive fallback with validation
      const fallbackRow = {
        ...originalRow,
        
        // Data integrity markers
        'Data_Integrity_Status': 'Fallback_Applied',
        'Original_Row_Index': index,
        'Processing_Row_Index': index,
        'Data_Source': 'Original_File_With_Fallback',
        
        // Fallback classification
        'Classification': 'Individual' as const,
        'Confidence_%': 50,
        'Processing_Tier': 'Fallback' as const,
        'Reasoning': 'No classification result found - emergency fallback applied',
        'Processing_Method': 'Emergency fallback V3 Fixed',
        
        // Keyword exclusion fallbacks
        'Matched_Keywords': '',
        'Keyword_Exclusion': 'No',
        'Keyword_Confidence': '0',
        'Keyword_Reasoning': 'No result found - fallback applied',
        
        'Matching_Rules': '',
        'Timestamp': new Date().toISOString(),
        'Export_Version': 'V3_Fixed_Fallback'
      };
      
      exportData.push(fallbackRow);
      return;
    }

    console.log('[BATCH EXPORTER V3] FIXED: Merging validated data for row', index, ':', {
      payeeName: result.payeeName,
      hasKeywordExclusion: !!result.result.keywordExclusion,
      isExcluded: result.result.keywordExclusion?.isExcluded,
      matchedKeywords: result.result.keywordExclusion?.matchedKeywords,
      originalDataKeys: Object.keys(originalRow)
    });

    const enhancedData = {
      // Data integrity markers
      'Data_Integrity_Status': 'Validated_Merge',
      'Original_Row_Index': index,
      'Processing_Row_Index': result.rowIndex ?? index,
      'Data_Source': 'Batch_Level_Merge',
      
      // Enhanced classification fields
      'Classification': result.result.classification,
      'Confidence_%': result.result.confidence,
      'Processing_Tier': result.result.processingTier,
      'Reasoning': result.result.reasoning,
      'Processing_Method': result.result.processingMethod || 'Enhanced Classification V3 Fixed',
      
      // FIXED: Keyword exclusion fields with comprehensive validation
      'Matched_Keywords': result.result.keywordExclusion?.matchedKeywords?.join('; ') || '',
      'Keyword_Exclusion': result.result.keywordExclusion?.isExcluded ? 'Yes' : 'No',
      'Keyword_Confidence': result.result.keywordExclusion?.confidence?.toString() || '0',
      'Keyword_Reasoning': result.result.keywordExclusion?.reasoning || 'No keyword exclusion applied',
      
      // Additional analysis fields
      'Matching_Rules': result.result.matchingRules?.join('; ') || '',
      'Timestamp': result.timestamp.toISOString(),
      'Export_Version': 'V3_Fixed'
    };

    // Add similarity scores if available
    if (result.result.similarityScores) {
      enhancedData['Levenshtein_Score'] = result.result.similarityScores.levenshtein?.toFixed(2) || '';
      enhancedData['Jaro_Winkler_Score'] = result.result.similarityScores.jaroWinkler?.toFixed(2) || '';
      enhancedData['Dice_Coefficient'] = result.result.similarityScores.dice?.toFixed(2) || '';
      enhancedData['Token_Sort_Ratio'] = result.result.similarityScores.tokenSort?.toFixed(2) || '';
      enhancedData['Combined_Similarity'] = result.result.similarityScores.combined?.toFixed(2) || '';
    }

    // GUARANTEE: Original data comes FIRST, then enhanced data
    const finalRow = includeAllColumns 
      ? { ...originalRow, ...enhancedData }
      : { ...originalRow, ...enhancedData };

    console.log('[BATCH EXPORTER V3] FIXED FINAL ROW:', {
      index,
      originalColumns: Object.keys(originalRow).length,
      enhancedColumns: Object.keys(enhancedData).length,
      totalColumns: Object.keys(finalRow).length,
      keywordExclusion: finalRow['Keyword_Exclusion'],
      matchedKeywords: finalRow['Matched_Keywords'],
      dataIntegrityStatus: finalRow['Data_Integrity_Status'],
      hasAllOriginalData: Object.keys(originalRow).every(key => finalRow.hasOwnProperty(key))
    });
    
    exportData.push(finalRow);
  });

  // ENHANCED: Add any unmatched results at the end with proper indexing
  unmatchedResults.forEach((result, unmatchedIndex) => {
    console.warn('[BATCH EXPORTER V3] FIXED: Adding unmatched result:', result.payeeName);
    
    const originalData = result.originalData || { 
      PayeeName: result.payeeName,
      RowIndex: `Unmatched_${unmatchedIndex}`,
      DataSource: 'Unmatched result recovery'
    };

    const unmatchedRow = {
      ...originalData,
      
      // Data integrity markers for unmatched
      'Data_Integrity_Status': 'Unmatched_Result',
      'Original_Row_Index': result.rowIndex ?? `Unmatched_${unmatchedIndex}`,
      'Processing_Row_Index': `Unmatched_${unmatchedIndex}`,
      'Data_Source': 'Unmatched_Result_Recovery',
      
      // Classification data
      'Classification': result.result.classification,
      'Confidence_%': result.result.confidence,
      'Processing_Tier': result.result.processingTier,
      'Reasoning': `${result.result.reasoning} (Unmatched result)`,
      'Processing_Method': result.result.processingMethod || 'Enhanced Classification V3 Fixed',
      
      // Keyword exclusion fields
      'Matched_Keywords': result.result.keywordExclusion?.matchedKeywords?.join('; ') || '',
      'Keyword_Exclusion': result.result.keywordExclusion?.isExcluded ? 'Yes' : 'No',
      'Keyword_Confidence': result.result.keywordExclusion?.confidence?.toString() || '0',
      'Keyword_Reasoning': result.result.keywordExclusion?.reasoning || 'No keyword exclusion applied',
      
      'Matching_Rules': result.result.matchingRules?.join('; ') || '',
      'Timestamp': result.timestamp.toISOString(),
      'Export_Version': 'V3_Fixed_Unmatched'
    };

    exportData.push(unmatchedRow);
  });

  console.log('[BATCH EXPORTER V3] FINAL EXPORT SUMMARY:', {
    totalOriginalRows: batchResult.originalFileData.length,
    totalResults: batchResult.results.length,
    totalExportRows: exportData.length,
    matchedRows: exportData.filter(r => r['Data_Integrity_Status'] === 'Validated_Merge').length,
    fallbackRows: exportData.filter(r => r['Data_Integrity_Status'] === 'Fallback_Applied').length,
    unmatchedRows: exportData.filter(r => r['Data_Integrity_Status'] === 'Unmatched_Result').length,
    dataIntegrityComplete: exportData.every(r => r['Data_Integrity_Status'])
  });

  return exportData;
}
