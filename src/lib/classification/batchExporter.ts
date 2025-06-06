
import { BatchProcessingResult } from '../types';

/**
 * Export results with original file data for V3 (Enhanced with keyword exclusion)
 */
export function exportResultsWithOriginalDataV3(
  batchResult: BatchProcessingResult,
  includeAllColumns: boolean = true
): any[] {
  console.log('[BATCH EXPORTER V3] Processing enhanced batch result:', {
    hasOriginalData: !!batchResult.originalFileData,
    originalDataLength: batchResult.originalFileData?.length || 0,
    resultsLength: batchResult.results.length,
    hasEnhancedResults: batchResult.results.some(r => !!r.result.keywordExclusion)
  });

  if (!batchResult.originalFileData || batchResult.originalFileData.length === 0) {
    console.log('[BATCH EXPORTER V3] No original file data, creating comprehensive enhanced export');
    // If no original file data, create a comprehensive export with enhanced fields
    return batchResult.results.map(result => {
      console.log('[BATCH EXPORTER V3] Processing enhanced result:', {
        payeeName: result.payeeName,
        hasKeywordExclusion: !!result.result.keywordExclusion,
        hasOriginalData: !!result.originalData,
        keywordExclusionData: result.result.keywordExclusion
      });

      const exportRow = {
        'Original_Name': result.payeeName,
        'Classification': result.result.classification,
        'Confidence_%': result.result.confidence,
        'Processing_Tier': result.result.processingTier,
        'Reasoning': result.result.reasoning,
        'Processing_Method': result.result.processingMethod || 'Enhanced Classification V3',
        'Matched_Keywords': result.result.keywordExclusion?.matchedKeywords?.join('; ') || '',
        'Keyword_Exclusion': result.result.keywordExclusion?.isExcluded ? 'Yes' : 'No',
        'Keyword_Confidence': result.result.keywordExclusion?.confidence?.toString() || '0',
        'Keyword_Reasoning': result.result.keywordExclusion?.reasoning || 'No keyword exclusion applied',
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
      } else {
        exportRow['Levenshtein_Score'] = '';
        exportRow['Jaro_Winkler_Score'] = '';
        exportRow['Dice_Coefficient'] = '';
        exportRow['Token_Sort_Ratio'] = '';
        exportRow['Combined_Similarity'] = '';
      }

      // Include original data if present
      if (result.originalData) {
        Object.assign(exportRow, result.originalData);
      }

      return exportRow;
    });
  }

  console.log('[BATCH EXPORTER V3] Merging original data with enhanced classification results');
  // Merge original data with enhanced classification results
  return batchResult.originalFileData.map((originalRow, index) => {
    const result = batchResult.results.find(r => r.rowIndex === index);

    if (!result) {
      console.log('[BATCH EXPORTER V3] No result found for row index:', index);
      // Emergency fallback with proper enhanced structure
      return {
        ...originalRow,
        'Classification': 'Individual' as const,
        'Confidence_%': 50,
        'Processing_Tier': 'Rule-Based' as const,
        'Reasoning': 'Result not found - emergency fallback',
        'Processing_Method': 'Emergency fallback V3',
        'Matched_Keywords': '',
        'Keyword_Exclusion': 'No',
        'Keyword_Confidence': '0',
        'Keyword_Reasoning': 'No result found',
        'Matching_Rules': '',
        'Levenshtein_Score': '',
        'Jaro_Winkler_Score': '',
        'Dice_Coefficient': '',
        'Token_Sort_Ratio': '',
        'Combined_Similarity': '',
        'Timestamp': new Date().toISOString()
      };
    }

    console.log('[BATCH EXPORTER V3] Processing enhanced result for row', index, ':', {
      payeeName: result.payeeName,
      hasKeywordExclusion: !!result.result.keywordExclusion,
      keywordExclusionData: result.result.keywordExclusion,
      hasOriginalData: !!result.originalData,
      processingTier: result.result.processingTier
    });

    const enhancedData = {
      'Classification': result.result.classification,
      'Confidence_%': result.result.confidence,
      'Processing_Tier': result.result.processingTier,
      'Reasoning': result.result.reasoning,
      'Processing_Method': result.result.processingMethod || 'Enhanced Classification V3',
      'Matched_Keywords': result.result.keywordExclusion?.matchedKeywords?.join('; ') || '',
      'Keyword_Exclusion': result.result.keywordExclusion?.isExcluded ? 'Yes' : 'No',
      'Keyword_Confidence': result.result.keywordExclusion?.confidence?.toString() || '0',
      'Keyword_Reasoning': result.result.keywordExclusion?.reasoning || 'No keyword exclusion applied',
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
    } else {
      enhancedData['Levenshtein_Score'] = '';
      enhancedData['Jaro_Winkler_Score'] = '';
      enhancedData['Dice_Coefficient'] = '';
      enhancedData['Token_Sort_Ratio'] = '';
      enhancedData['Combined_Similarity'] = '';
    }

    const finalRow = includeAllColumns 
      ? { ...originalRow, ...enhancedData }
      : enhancedData;

    console.log('[BATCH EXPORTER V3] Final enhanced row data for index', index, ':', {
      hasOriginalColumns: Object.keys(originalRow).length,
      hasEnhancedColumns: Object.keys(enhancedData).length,
      totalColumns: Object.keys(finalRow).length,
      keywordExclusion: finalRow['Keyword_Exclusion'],
      matchedKeywords: finalRow['Matched_Keywords']
    });
    
    return finalRow;
  });
}
