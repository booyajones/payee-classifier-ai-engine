
import { BatchProcessingResult } from '../types';
import { loadAllClassificationResults } from '../database/classificationService';

/**
 * Export that preserves original data and adds classification results with SIC codes from database
 */
export async function exportResultsWithOriginalDataV3(
  batchResult: BatchProcessingResult,
  includeAllColumns: boolean = true
): Promise<any[]> {
  console.log('[BATCH EXPORTER] Starting enhanced export with SIC data validation:', {
    resultsLength: batchResult.results.length,
    originalDataLength: batchResult.originalFileData?.length || 0
  });

  // Load all classification results from database to get SIC codes
  let databaseResults: any[] = [];
  try {
    databaseResults = await loadAllClassificationResults();
    console.log(`[BATCH EXPORTER] Loaded ${databaseResults.length} results from database`);
  } catch (error) {
    console.warn('[BATCH EXPORTER] Failed to load database results, using memory data:', error);
  }

  // Check if we have properly mapped results (results should match original data length)
  if (!batchResult.originalFileData || batchResult.originalFileData.length === 0) {
    throw new Error('No original file data available for export');
  }

  // If results length matches original data length, we have properly mapped data
  if (batchResult.results.length === batchResult.originalFileData.length) {
    console.log('[BATCH EXPORTER] Using properly mapped results for export');
    
    const exportData: any[] = [];
    
    for (let i = 0; i < batchResult.results.length; i++) {
      const result = batchResult.results[i];
      const originalRow = batchResult.originalFileData[i];
      
      // Enhanced SIC code resolution
      let sicCode = result.result.sicCode || '';
      let sicDescription = result.result.sicDescription || '';
      
      // Try database lookup if SIC is missing
      if (!sicCode && result.payeeName) {
        const dbResult = databaseResults.find(db => db.payeeName === result.payeeName);
        if (dbResult?.result?.sicCode) {
          sicCode = dbResult.result.sicCode;
          sicDescription = dbResult.result.sicDescription || '';
        }
      }
      
      const exportRow = {
        // Preserve ALL original columns exactly as they were
        ...originalRow,
        
        // Add classification results
        'classification': result.result.classification,
        'confidence': result.result.confidence,
        'processingTier': result.result.processingTier,
        'reasoning': result.result.reasoning,
        'processingMethod': result.result.processingMethod || 'OpenAI Classification',
        
        // Add SIC code information
        'sicCode': sicCode,
        'sicDescription': sicDescription,
        
        // Add keyword exclusion results
        'keywordExclusion': result.result.keywordExclusion?.isExcluded ? 'Yes' : 'No',
        'matchedKeywords': result.result.keywordExclusion?.matchedKeywords?.join('; ') || '',
        'keywordConfidence': result.result.keywordExclusion?.confidence?.toString() || '0',
        'keywordReasoning': result.result.keywordExclusion?.reasoning || 'No keyword exclusion applied',
        
        // Add timestamp
        'timestamp': result.timestamp instanceof Date ? result.timestamp.toISOString() : new Date().toISOString()
      };

      exportData.push(exportRow);
    }
    
    const sicCount = exportData.filter(row => row.sicCode && row.sicCode !== '').length;
    const businessCount = exportData.filter(row => row.classification === 'Business').length;
    
    console.log('[BATCH EXPORTER] Enhanced export complete with properly mapped data:', {
      inputRows: batchResult.results.length,
      outputRows: exportData.length,
      businessCount: businessCount,
      sicCodesIncluded: sicCount,
      sicCoverage: businessCount > 0 ? `${Math.round((sicCount / businessCount) * 100)}%` : '0%'
    });

    return exportData;
  }

  // Fallback: if we have unmapped results, create simple export
  console.log('[BATCH EXPORTER] Using fallback export for unmapped results');
  const exportData = batchResult.originalFileData.map((originalRow, index) => ({
    ...originalRow,
    classification: 'Individual',
    confidence: 0,
    processingTier: 'Unmapped',
    reasoning: 'Result mapping failed',
    processingMethod: 'Fallback',
    sicCode: '',
    sicDescription: '',
    keywordExclusion: 'No',
    matchedKeywords: '',
    keywordConfidence: '0',
    keywordReasoning: 'No processing applied',
    timestamp: new Date().toISOString()
  }));

  console.log('[BATCH EXPORTER] Fallback export complete:', {
    outputRows: exportData.length
  });

  return exportData;
}

/**
 * Direct CSV export with enhanced SIC data handling
 */
export async function exportDirectCSV(batchResult: BatchProcessingResult): Promise<{ headers: string[]; rows: any[][] }> {
  console.log('[CSV EXPORTER] Starting enhanced CSV export with SIC data:', {
    resultsLength: batchResult.results.length,
    originalDataLength: batchResult.originalFileData?.length || 0
  });

  // Use the enhanced export function to get properly formatted data
  const exportData = await exportResultsWithOriginalDataV3(batchResult, true);

  // Get all possible column names from first row
  const headers = exportData.length > 0 ? Object.keys(exportData[0]) : [];
  
  // Create rows
  const rows: any[][] = exportData.map(row => {
    return headers.map(header => row[header] || '');
  });

  const sicCodeIndex = headers.indexOf('sicCode');
  const sicCount = sicCodeIndex >= 0 ? rows.filter(row => row[sicCodeIndex] && row[sicCodeIndex] !== '').length : 0;
  const classificationIndex = headers.indexOf('classification');
  const businessCount = classificationIndex >= 0 ? rows.filter(row => row[classificationIndex] === 'Business').length : 0;
  
  console.log('[CSV EXPORTER] Enhanced CSV export complete:', {
    headers: headers.length,
    rows: rows.length,
    businessCount: businessCount,
    sicCodesIncluded: sicCount,
    sicCoverage: businessCount > 0 ? `${Math.round((sicCount / businessCount) * 100)}%` : '0%'
  });

  return { headers, rows };
}
