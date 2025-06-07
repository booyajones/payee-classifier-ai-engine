
import { BatchProcessingResult } from '../types';

/**
 * Simple export that preserves original data and adds classification results
 */
export function exportResultsWithOriginalDataV3(
  batchResult: BatchProcessingResult,
  includeAllColumns: boolean = true
): any[] {
  console.log('[BATCH EXPORTER] Starting export:', {
    hasOriginalData: !!batchResult.originalFileData,
    originalDataLength: batchResult.originalFileData?.length || 0,
    resultsLength: batchResult.results.length
  });

  const exportData: any[] = [];
  
  // Simple 1:1 mapping
  for (let i = 0; i < batchResult.results.length; i++) {
    const result = batchResult.results[i];
    const originalRow = batchResult.originalFileData?.[i] || {};
    
    // Handle timestamp properly
    let timestampString = '';
    try {
      if (result.timestamp instanceof Date) {
        timestampString = result.timestamp.toISOString();
      } else if (typeof result.timestamp === 'string') {
        timestampString = result.timestamp;
      } else if (result.timestamp) {
        timestampString = new Date(result.timestamp).toISOString();
      } else {
        timestampString = new Date().toISOString();
      }
    } catch (error) {
      console.warn(`[BATCH EXPORTER] Timestamp conversion error for row ${i}:`, error);
      timestampString = new Date().toISOString();
    }
    
    // Create export row - original data first, then classification results
    const exportRow = {
      // Original data preserved as-is
      ...originalRow,
      
      // Classification results
      'Classification': result.result.classification,
      'Confidence_%': result.result.confidence,
      'Processing_Tier': result.result.processingTier,
      'Reasoning': result.result.reasoning,
      'Processing_Method': result.result.processingMethod || 'OpenAI Classification',
      
      // Keyword exclusion data
      'Keyword_Exclusion': result.result.keywordExclusion?.isExcluded ? 'Yes' : 'No',
      'Matched_Keywords': result.result.keywordExclusion?.matchedKeywords?.join('; ') || '',
      'Keyword_Confidence': result.result.keywordExclusion?.confidence?.toString() || '0',
      'Keyword_Reasoning': result.result.keywordExclusion?.reasoning || 'No keyword exclusion applied',
      
      // Additional fields
      'Matching_Rules': result.result.matchingRules?.join('; ') || '',
      'Timestamp': timestampString,
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

  console.log('[BATCH EXPORTER] Export complete:', {
    totalRows: exportData.length
  });

  return exportData;
}
