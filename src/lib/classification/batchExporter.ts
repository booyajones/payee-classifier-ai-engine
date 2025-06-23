
import { BatchProcessingResult } from '../types';

/**
 * Export that preserves original data and adds classification results with strict 1:1 mapping
 */
export function exportResultsWithOriginalDataV3(
  batchResult: BatchProcessingResult,
  includeAllColumns: boolean = true
): any[] {
  console.log('[BATCH EXPORTER] Starting export with strict validation:', {
    resultsLength: batchResult.results.length,
    originalDataLength: batchResult.originalFileData?.length || 0
  });

  // STRICT VALIDATION: Must have exact same number of rows
  if (!batchResult.originalFileData || batchResult.originalFileData.length !== batchResult.results.length) {
    throw new Error(`Row count mismatch: ${batchResult.results.length} results vs ${batchResult.originalFileData?.length || 0} original rows`);
  }

  const exportData: any[] = [];
  
  // Simple 1:1 mapping - no loops, no filters, no synthetic data
  for (let i = 0; i < batchResult.results.length; i++) {
    const result = batchResult.results[i];
    const originalRow = batchResult.originalFileData[i];
    
    if (!result || !originalRow) {
      throw new Error(`Missing data at index ${i}: result=${!!result}, originalRow=${!!originalRow}`);
    }
    
    // Handle timestamp conversion
    let timestampString = '';
    try {
      if (result.timestamp instanceof Date) {
        timestampString = result.timestamp.toISOString();
      } else if (typeof result.timestamp === 'string') {
        timestampString = result.timestamp;
      } else {
        timestampString = new Date().toISOString();
      }
    } catch (error) {
      timestampString = new Date().toISOString();
    }
    
    // Create export row: original data + classification columns (using consistent camelCase naming)
    const exportRow = {
      // Preserve ALL original columns exactly as they were
      ...originalRow,
      
      // Add classification results with consistent camelCase naming
      'classification': result.result.classification,
      'confidence': result.result.confidence,
      'processingTier': result.result.processingTier,
      'reasoning': result.result.reasoning,
      'processingMethod': result.result.processingMethod || 'OpenAI Classification',
      
      // Add keyword exclusion results with consistent camelCase naming
      'keywordExclusion': result.result.keywordExclusion?.isExcluded ? 'Yes' : 'No',
      'matchedKeywords': result.result.keywordExclusion?.matchedKeywords?.join('; ') || '',
      'keywordConfidence': result.result.keywordExclusion?.confidence?.toString() || '0',
      'keywordReasoning': result.result.keywordExclusion?.reasoning || 'No keyword exclusion applied',
      
      // Add timestamp
      'timestamp': timestampString
    };

    exportData.push(exportRow);
  }

  // FINAL VALIDATION
  if (exportData.length !== batchResult.results.length) {
    throw new Error(`Export count mismatch: created ${exportData.length} rows from ${batchResult.results.length} results`);
  }

  console.log('[BATCH EXPORTER] Export complete - EXACT ROW COUNT:', {
    inputRows: batchResult.results.length,
    outputRows: exportData.length,
    validated: exportData.length === batchResult.results.length
  });

  return exportData;
}
