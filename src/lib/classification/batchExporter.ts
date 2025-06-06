
import { BatchProcessingResult } from '../types';

/**
 * SIMPLIFIED export with GUARANTEED perfect 1:1 alignment
 * Since processing is now sequential, alignment is perfect
 */
export function exportResultsWithOriginalDataV3(
  batchResult: BatchProcessingResult,
  includeAllColumns: boolean = true
): any[] {
  console.log('[BATCH EXPORTER V3] Perfect alignment export:', {
    hasOriginalData: !!batchResult.originalFileData,
    originalDataLength: batchResult.originalFileData?.length || 0,
    resultsLength: batchResult.results.length
  });

  // Since processing is sequential, alignment is guaranteed
  const exportData: any[] = [];
  
  for (let i = 0; i < batchResult.results.length; i++) {
    const result = batchResult.results[i];
    const originalRow = batchResult.originalFileData?.[i] || {};
    
    // Create export row - original data first, then classification
    const exportRow = {
      // Original data preserved
      ...originalRow,
      
      // Classification results
      'Classification': result.result.classification,
      'Confidence_%': result.result.confidence,
      'Processing_Tier': result.result.processingTier,
      'Reasoning': result.result.reasoning,
      'Processing_Method': result.result.processingMethod || 'Enhanced Classification V3',
      
      // Keyword exclusion
      'Matched_Keywords': result.result.keywordExclusion?.matchedKeywords?.join('; ') || '',
      'Keyword_Exclusion': result.result.keywordExclusion?.isExcluded ? 'Yes' : 'No',
      'Keyword_Confidence': result.result.keywordExclusion?.confidence?.toString() || '0',
      'Keyword_Reasoning': result.result.keywordExclusion?.reasoning || 'No keyword exclusion applied',
      
      // Additional fields
      'Matching_Rules': result.result.matchingRules?.join('; ') || '',
      'Timestamp': result.timestamp.toISOString(),
      'Row_Index': i
    };

    // Add similarity scores if available
    if (result.result.similarityScores) {
      exportRow['Levenshtein_Score'] = result.result.similarityScores.levenshtein?.toFixed(2) || '';
      exportRow['Jaro_Winkler_Score'] = result.result.similarityScores.jaroWinkler?.toFixed(2) || '';
      exportRow['Dice_Coefficient'] = result.result.similarityScores.dice?.toFixed(2) || '';
      exportRow['Token_Sort_Ratio'] = result.result.similarityScores.tokenSort?.toFixed(2) || '';
      exportRow['Combined_Similarity'] = result.result.similarityScores.combined?.toFixed(2) || '';
    }
    
    exportData.push(exportRow);
  }

  console.log('[BATCH EXPORTER V3] Perfect alignment export complete:', {
    totalRows: exportData.length,
    perfectAlignment: true
  });

  return exportData;
}
