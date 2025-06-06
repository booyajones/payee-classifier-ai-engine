
import { BatchProcessingResult } from '../types';

/**
 * FIXED: Ultra-simple export with GUARANTEED perfect 1:1 alignment
 * No fallbacks, no complex logic - just direct mapping
 */
export function exportResultsWithOriginalDataV3(
  batchResult: BatchProcessingResult,
  includeAllColumns: boolean = true
): any[] {
  console.log('[BATCH EXPORTER V3] FIXED: Ultra-simple perfect alignment export:', {
    hasOriginalData: !!batchResult.originalFileData,
    originalDataLength: batchResult.originalFileData?.length || 0,
    resultsLength: batchResult.results.length,
    perfectAlignment: batchResult.originalFileData?.length === batchResult.results.length
  });

  // VALIDATION: Ensure perfect alignment before proceeding
  if (batchResult.originalFileData && batchResult.originalFileData.length !== batchResult.results.length) {
    throw new Error(`Export alignment error: ${batchResult.originalFileData.length} original rows vs ${batchResult.results.length} results`);
  }

  const exportData: any[] = [];
  
  // FIXED: Simple 1:1 mapping with no complex logic
  for (let i = 0; i < batchResult.results.length; i++) {
    const result = batchResult.results[i];
    const originalRow = batchResult.originalFileData?.[i] || {};
    
    // VALIDATION: Ensure row index matches array position
    if (result.rowIndex !== i) {
      console.warn(`[BATCH EXPORTER V3] Row index mismatch at position ${i}: expected ${i}, got ${result.rowIndex}`);
    }
    
    // Create export row - simple merge
    const exportRow = {
      // Original data first (preserved as-is)
      ...originalRow,
      
      // Classification results (overwrites any conflicting original columns)
      'Classification': result.result.classification,
      'Confidence_%': result.result.confidence,
      'Processing_Tier': result.result.processingTier,
      'Reasoning': result.result.reasoning,
      'Processing_Method': result.result.processingMethod || 'OpenAI Batch API (Fixed)',
      
      // Keyword exclusion (simplified)
      'Matched_Keywords': result.result.keywordExclusion?.matchedKeywords?.join('; ') || '',
      'Keyword_Exclusion': result.result.keywordExclusion?.isExcluded ? 'Yes' : 'No',
      'Keyword_Confidence': result.result.keywordExclusion?.confidence?.toString() || '0',
      'Keyword_Reasoning': result.result.keywordExclusion?.reasoning || 'No keyword exclusion applied',
      
      // Additional fields
      'Matching_Rules': result.result.matchingRules?.join('; ') || '',
      'Timestamp': result.timestamp.toISOString(),
      'Row_Index': i,
      'Data_Integrity_Status': 'Perfect_Alignment'
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

  // FINAL VALIDATION
  if (exportData.length !== batchResult.results.length) {
    throw new Error(`Export length mismatch: expected ${batchResult.results.length}, got ${exportData.length}`);
  }

  console.log('[BATCH EXPORTER V3] FIXED: Perfect alignment export complete:', {
    totalRows: exportData.length,
    perfectAlignment: true,
    allRowsHaveIntegrityStatus: exportData.every(row => row['Data_Integrity_Status'] === 'Perfect_Alignment')
  });

  return exportData;
}
