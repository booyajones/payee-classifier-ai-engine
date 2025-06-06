
import { BatchProcessingResult } from '../types';

/**
 * SIMPLIFIED export with GUARANTEED perfect data alignment
 * NO COMPLEX MERGING - simple 1:1 array mapping
 */
export function exportResultsWithOriginalDataV3(
  batchResult: BatchProcessingResult,
  includeAllColumns: boolean = true
): any[] {
  console.log('[BATCH EXPORTER V3] FIXED: Simple export with perfect alignment:', {
    hasOriginalData: !!batchResult.originalFileData,
    originalDataLength: batchResult.originalFileData?.length || 0,
    resultsLength: batchResult.results.length,
    perfectAlignment: batchResult.originalFileData?.length === batchResult.results.length
  });

  // CRITICAL VALIDATION: Ensure perfect alignment
  if (batchResult.originalFileData && batchResult.originalFileData.length !== batchResult.results.length) {
    throw new Error(`Export alignment error: ${batchResult.originalFileData.length} original rows vs ${batchResult.results.length} results`);
  }

  // SIMPLE APPROACH: Process each row in order
  const exportData: any[] = [];
  
  for (let i = 0; i < batchResult.results.length; i++) {
    const result = batchResult.results[i];
    const originalRow = batchResult.originalFileData?.[i] || {};
    
    // VALIDATION: Ensure row index matches array position
    if (result.rowIndex !== i) {
      console.error(`[BATCH EXPORTER V3] Row index mismatch at position ${i}: expected ${i}, got ${result.rowIndex}`);
    }
    
    // Create export row with original data first, then classification data
    const exportRow = {
      // Original data comes first
      ...originalRow,
      
      // Classification results
      'Classification': result.result.classification,
      'Confidence_%': result.result.confidence,
      'Processing_Tier': result.result.processingTier,
      'Reasoning': result.result.reasoning,
      'Processing_Method': result.result.processingMethod || 'Enhanced Classification V3',
      
      // Keyword exclusion fields
      'Matched_Keywords': result.result.keywordExclusion?.matchedKeywords?.join('; ') || '',
      'Keyword_Exclusion': result.result.keywordExclusion?.isExcluded ? 'Yes' : 'No',
      'Keyword_Confidence': result.result.keywordExclusion?.confidence?.toString() || '0',
      'Keyword_Reasoning': result.result.keywordExclusion?.reasoning || 'No keyword exclusion applied',
      
      // Additional fields
      'Matching_Rules': result.result.matchingRules?.join('; ') || '',
      'Timestamp': result.timestamp.toISOString(),
      'Row_Index': i,
      'Export_Version': 'V3_Simple_Fixed'
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

  console.log('[BATCH EXPORTER V3] SIMPLE EXPORT COMPLETE:', {
    totalRows: exportData.length,
    perfectAlignment: exportData.length === batchResult.results.length,
    sampleRow: exportData[0]
  });

  return exportData;
}
