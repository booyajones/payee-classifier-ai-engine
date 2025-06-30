
import { BatchProcessingResult } from '../types';
import { loadAllClassificationResults } from '../database/classificationService';

/**
 * Export that preserves original data and adds classification results with enhanced SIC code debugging
 */
export async function exportResultsWithOriginalDataV3(
  batchResult: BatchProcessingResult,
  includeAllColumns: boolean = true
): Promise<any[]> {
  console.log('[BATCH EXPORTER] === STARTING ENHANCED EXPORT WITH COMPREHENSIVE SIC CODE DEBUGGING ===');
  console.log('[BATCH EXPORTER] Input validation:', {
    resultsLength: batchResult.results.length,
    originalDataLength: batchResult.originalFileData?.length || 0,
    firstResultHasSicCode: batchResult.results[0]?.result?.sicCode ? true : false,
    firstResultSicCode: batchResult.results[0]?.result?.sicCode
  });

  // Load all classification results from database to get SIC codes
  let databaseResults: any[] = [];
  try {
    databaseResults = await loadAllClassificationResults();
    console.log(`[BATCH EXPORTER] Loaded ${databaseResults.length} results from database`);
    
    // Debug database SIC codes
    const dbSicCount = databaseResults.filter(r => r.result?.sicCode).length;
    console.log(`[BATCH EXPORTER] Database SIC codes: ${dbSicCount}/${databaseResults.length} results have SIC codes`);
    
    if (dbSicCount > 0) {
      console.log('[BATCH EXPORTER] Sample database SIC codes:', databaseResults
        .filter(r => r.result?.sicCode)
        .slice(0, 3)
        .map(r => ({ payee: r.payeeName, sicCode: r.result.sicCode }))
      );
    }
  } catch (error) {
    console.warn('[BATCH EXPORTER] Failed to load database results, using memory data:', error);
  }

  // Check if we have original file data
  if (!batchResult.originalFileData || batchResult.originalFileData.length === 0) {
    throw new Error('No original file data available for export');
  }

  console.log(`[BATCH EXPORTER] Processing ${batchResult.results.length} results for ${batchResult.originalFileData.length} original rows`);
  
  const exportData: any[] = [];
  
  // Process each result and preserve all SIC code sources
  for (let i = 0; i < batchResult.results.length; i++) {
    const result = batchResult.results[i];
    const originalRow = result.originalData || batchResult.originalFileData[i] || {};
    
    // Multi-source SIC code resolution with debugging
    let sicCode = '';
    let sicDescription = '';
    let sicSource = 'none';
    
    // Source 1: Direct from result
    if (result.result.sicCode) {
      sicCode = result.result.sicCode;
      sicDescription = result.result.sicDescription || '';
      sicSource = 'result';
      console.log(`[BATCH EXPORTER] SIC from result for "${result.payeeName}": ${sicCode}`);
    }
    // Source 2: Database lookup
    else if (result.payeeName) {
      const dbResult = databaseResults.find(db => db.payeeName === result.payeeName);
      if (dbResult?.result?.sicCode) {
        sicCode = dbResult.result.sicCode;
        sicDescription = dbResult.result.sicDescription || '';
        sicSource = 'database';
        console.log(`[BATCH EXPORTER] SIC from database for "${result.payeeName}": ${sicCode}`);
      }
    }
    // Source 3: Original data (if mapped)
    if (!sicCode && originalRow.sicCode) {
      sicCode = originalRow.sicCode;
      sicDescription = originalRow.sicDescription || '';
      sicSource = 'original';
      console.log(`[BATCH EXPORTER] SIC from original data for "${result.payeeName}": ${sicCode}`);
    }
    
    // Log missing SIC codes for businesses
    if (result.result.classification === 'Business' && !sicCode) {
      console.warn(`[BATCH EXPORTER] ❌ Business "${result.payeeName}" missing SIC code from all sources`);
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
      
      // Add SIC code information with source tracking
      'sicCode': sicCode,
      'sicDescription': sicDescription,
      'sicSource': sicSource,
      
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
  
  // Final statistics with comprehensive SIC code analysis
  const totalRows = exportData.length;
  const businessRows = exportData.filter(row => row.classification === 'Business');
  const businessCount = businessRows.length;
  const sicRows = exportData.filter(row => row.sicCode && row.sicCode !== '');
  const sicCount = sicRows.length;
  
  // SIC source breakdown
  const sicSources = {
    result: exportData.filter(row => row.sicSource === 'result').length,
    database: exportData.filter(row => row.sicSource === 'database').length,
    original: exportData.filter(row => row.sicSource === 'original').length,
    none: exportData.filter(row => row.sicSource === 'none').length
  };
  
  console.log('[BATCH EXPORTER] === EXPORT COMPLETE WITH DETAILED SIC ANALYSIS ===');
  console.log('[BATCH EXPORTER] Export statistics:', {
    totalRows: totalRows,
    businessCount: businessCount,
    sicCount: sicCount,
    sicCoverage: businessCount > 0 ? `${Math.round((sicCount / businessCount) * 100)}%` : '0%',
    sicSources: sicSources
  });

  // Sample SIC codes in export
  if (sicCount > 0) {
    console.log('[BATCH EXPORTER] Sample SIC codes in export:', sicRows.slice(0, 3).map(row => ({
      classification: row.classification,
      sicCode: row.sicCode,
      sicSource: row.sicSource,
      sicDescription: row.sicDescription?.substring(0, 50)
    })));
  } else {
    console.error('[BATCH EXPORTER] ❌ NO SIC CODES IN EXPORT! This is the root issue.');
  }

  return exportData;
}

/**
 * Direct CSV export with enhanced SIC data handling and debugging
 */
export async function exportDirectCSV(batchResult: BatchProcessingResult): Promise<{ headers: string[]; rows: any[][] }> {
  console.log('[CSV EXPORTER] Starting enhanced CSV export with comprehensive SIC debugging');

  // Use the enhanced export function to get properly formatted data
  const exportData = await exportResultsWithOriginalDataV3(batchResult, true);

  // Get all possible column names from first row
  const headers = exportData.length > 0 ? Object.keys(exportData[0]) : [];
  
  // Create rows
  const rows: any[][] = exportData.map(row => {
    return headers.map(header => row[header] || '');
  });

  // Final CSV statistics
  const sicCodeIndex = headers.indexOf('sicCode');
  const sicCount = sicCodeIndex >= 0 ? rows.filter(row => row[sicCodeIndex] && row[sicCodeIndex] !== '').length : 0;
  const classificationIndex = headers.indexOf('classification');
  const businessCount = classificationIndex >= 0 ? rows.filter(row => row[classificationIndex] === 'Business').length : 0;
  
  console.log('[CSV EXPORTER] Final CSV export statistics:', {
    headers: headers.length,
    rows: rows.length,
    businessCount: businessCount,
    sicCodesIncluded: sicCount,
    sicCoverage: businessCount > 0 ? `${Math.round((sicCount / businessCount) * 100)}%` : '0%',
    hasSicColumn: headers.includes('sicCode'),
    hasSicDescriptionColumn: headers.includes('sicDescription')
  });

  return { headers, rows };
}
