
import { BatchProcessingResult } from '../types';

/**
 * GUARANTEED export with ALL original data + enhanced fields including keyword exclusions
 */
export function exportResultsWithOriginalDataV3(
  batchResult: BatchProcessingResult,
  includeAllColumns: boolean = true
): any[] {
  console.log('[BATCH EXPORTER V3] GUARANTEE: Processing batch result with complete data:', {
    hasOriginalData: !!batchResult.originalFileData,
    originalDataLength: batchResult.originalFileData?.length || 0,
    resultsLength: batchResult.results.length,
    allResultsHaveOriginalData: batchResult.results.every(r => !!r.originalData),
    allResultsHaveKeywordExclusion: batchResult.results.every(r => !!r.result.keywordExclusion)
  });

  if (!batchResult.originalFileData || batchResult.originalFileData.length === 0) {
    console.log('[BATCH EXPORTER V3] Using row-level original data (batch-level missing)');
    // Use individual row original data
    return batchResult.results.map((result, index) => {
      const originalData = result.originalData || { 
        PayeeName: result.payeeName, 
        RowIndex: index,
        DataSource: 'Row-level recovery'
      };

      const exportRow = {
        // GUARANTEE: Original data comes first
        ...originalData,
        
        // GUARANTEE: Enhanced classification fields
        'Classification': result.result.classification,
        'Confidence_%': result.result.confidence,
        'Processing_Tier': result.result.processingTier,
        'Reasoning': result.result.reasoning,
        'Processing_Method': result.result.processingMethod || 'Enhanced Classification V3',
        
        // GUARANTEE: Keyword exclusion fields (always present)
        'Matched_Keywords': result.result.keywordExclusion?.matchedKeywords?.join('; ') || '',
        'Keyword_Exclusion': result.result.keywordExclusion?.isExcluded ? 'Yes' : 'No',
        'Keyword_Confidence': result.result.keywordExclusion?.confidence?.toString() || '0',
        'Keyword_Reasoning': result.result.keywordExclusion?.reasoning || 'No keyword exclusion applied',
        
        // Enhanced analysis fields
        'Matching_Rules': result.result.matchingRules?.join('; ') || '',
        'Timestamp': result.timestamp.toISOString()
      };

      // Add similarity scores if available
      if (result.result.similarityScores) {
        exportRow['Levenshtein_Score'] = result.result.similarityScores.levenshtein?.toFixed(2) || '';
        exportRow['Jaro_Winkler_Score'] = result.result.similarityScores.jaroWinkler?.toFixed(2) || '';
        exportRow['Dice_Coefficient'] = result.result.similarityScores.dice?.toFixed(2) || '';
        exportRow['Token_Sort_Ratio'] = result.result.similarityScores.tokenSort?.toFixed(2) || '';
        exportRow['Combined_Similarity'] = result.result.similarityScores.combined?.toFixed(2) || '';
      }

      console.log('[BATCH EXPORTER V3] Row export:', {
        index,
        originalDataKeys: Object.keys(originalData),
        hasKeywordExclusion: !!result.result.keywordExclusion,
        keywordExclusionStatus: exportRow['Keyword_Exclusion'],
        totalColumns: Object.keys(exportRow).length
      });

      return exportRow;
    });
  }

  console.log('[BATCH EXPORTER V3] GUARANTEE: Merging batch-level original data with enhanced results');
  // Merge batch-level original data with enhanced classification results
  return batchResult.originalFileData.map((originalRow, index) => {
    const result = batchResult.results.find(r => r.rowIndex === index);

    if (!result) {
      console.error('[BATCH EXPORTER V3] CRITICAL: No result found for row index:', index);
      // Emergency fallback with proper enhanced structure
      return {
        ...originalRow,
        'Classification': 'Individual' as const,
        'Confidence_%': 50,
        'Processing_Tier': 'Failed' as const,
        'Reasoning': 'Result not found - emergency fallback',
        'Processing_Method': 'Emergency fallback V3',
        'Matched_Keywords': '',
        'Keyword_Exclusion': 'No',
        'Keyword_Confidence': '0',
        'Keyword_Reasoning': 'No result found',
        'Matching_Rules': '',
        'Timestamp': new Date().toISOString()
      };
    }

    console.log('[BATCH EXPORTER V3] GUARANTEE: Merging data for row', index, ':', {
      payeeName: result.payeeName,
      hasKeywordExclusion: !!result.result.keywordExclusion,
      isExcluded: result.result.keywordExclusion?.isExcluded,
      matchedKeywords: result.result.keywordExclusion?.matchedKeywords,
      originalDataKeys: Object.keys(originalRow)
    });

    const enhancedData = {
      // GUARANTEE: All enhanced classification fields
      'Classification': result.result.classification,
      'Confidence_%': result.result.confidence,
      'Processing_Tier': result.result.processingTier,
      'Reasoning': result.result.reasoning,
      'Processing_Method': result.result.processingMethod || 'Enhanced Classification V3',
      
      // GUARANTEE: Keyword exclusion fields (mandatory)
      'Matched_Keywords': result.result.keywordExclusion?.matchedKeywords?.join('; ') || '',
      'Keyword_Exclusion': result.result.keywordExclusion?.isExcluded ? 'Yes' : 'No',
      'Keyword_Confidence': result.result.keywordExclusion?.confidence?.toString() || '0',
      'Keyword_Reasoning': result.result.keywordExclusion?.reasoning || 'No keyword exclusion applied',
      
      // Additional analysis fields
      'Matching_Rules': result.result.matchingRules?.join('; ') || '',
      'Timestamp': result.timestamp.toISOString()
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
      : { ...originalRow, ...enhancedData }; // Always include original columns

    console.log('[BATCH EXPORTER V3] FINAL ROW:', {
      index,
      originalColumns: Object.keys(originalRow).length,
      enhancedColumns: Object.keys(enhancedData).length,
      totalColumns: Object.keys(finalRow).length,
      keywordExclusion: finalRow['Keyword_Exclusion'],
      matchedKeywords: finalRow['Matched_Keywords'],
      hasAllOriginalData: Object.keys(originalRow).every(key => finalRow.hasOwnProperty(key)),
      firstFewKeys: Object.keys(finalRow).slice(0, 5)
    });
    
    return finalRow;
  });
}
