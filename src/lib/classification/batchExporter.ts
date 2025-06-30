
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

  // STRICT VALIDATION: Must have exact same number of rows
  if (!batchResult.originalFileData || batchResult.originalFileData.length !== batchResult.results.length) {
    throw new Error(`Row count mismatch: ${batchResult.results.length} results vs ${batchResult.originalFileData?.length || 0} original rows`);
  }

  const exportData: any[] = [];
  
  // Enhanced 1:1 mapping with better SIC data handling
  for (let i = 0; i < batchResult.results.length; i++) {
    const result = batchResult.results[i];
    const originalRow = batchResult.originalFileData[i];
    
    if (!result || !originalRow) {
      throw new Error(`Missing data at index ${i}: result=${!!result}, originalRow=${!!originalRow}`);
    }
    
    // Try multiple strategies to find SIC codes
    let sicCode = '';
    let sicDescription = '';
    
    // Strategy 1: Look for exact payee name match in database
    const dbResultByName = databaseResults.find(db => db.payeeName === result.payeeName);
    if (dbResultByName?.result?.sicCode) {
      sicCode = dbResultByName.result.sicCode;
      sicDescription = dbResultByName.result.sicDescription || '';
      console.log(`[BATCH EXPORTER] Found SIC via name match: ${result.payeeName} -> ${sicCode}`);
    }
    
    // Strategy 2: Look for row index match in database
    if (!sicCode && result.rowIndex !== undefined) {
      const dbResultByIndex = databaseResults.find(db => db.rowIndex === result.rowIndex);
      if (dbResultByIndex?.result?.sicCode) {
        sicCode = dbResultByIndex.result.sicCode;
        sicDescription = dbResultByIndex.result.sicDescription || '';
        console.log(`[BATCH EXPORTER] Found SIC via row index: ${result.rowIndex} -> ${sicCode}`);
      }
    }
    
    // Strategy 3: Use memory data if available
    if (!sicCode && result.result.sicCode) {
      sicCode = result.result.sicCode;
      sicDescription = result.result.sicDescription || '';
      console.log(`[BATCH EXPORTER] Using memory SIC data: ${result.payeeName} -> ${sicCode}`);
    }
    
    // Strategy 4: Final fallback - check if it's a business that should have SIC
    if (!sicCode && result.result.classification === 'Business') {
      console.warn(`[BATCH EXPORTER] Business "${result.payeeName}" missing SIC code from all sources`);
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
    
    // Create export row: original data + classification columns + enhanced SIC data
    const exportRow = {
      // Preserve ALL original columns exactly as they were
      ...originalRow,
      
      // Add classification results with consistent camelCase naming
      'classification': result.result.classification,
      'confidence': result.result.confidence,
      'processingTier': result.result.processingTier,
      'reasoning': result.result.reasoning,
      'processingMethod': result.result.processingMethod || 'OpenAI Classification',
      
      // Add enhanced SIC code information
      'sicCode': sicCode,
      'sicDescription': sicDescription,
      
      // Add keyword exclusion results
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

  const sicCount = exportData.filter(row => row.sicCode && row.sicCode !== '').length;
  const businessCount = exportData.filter(row => row.classification === 'Business').length;
  
  console.log('[BATCH EXPORTER] Enhanced export complete with SIC data:', {
    inputRows: batchResult.results.length,
    outputRows: exportData.length,
    businessCount: businessCount,
    sicCodesIncluded: sicCount,
    sicCoverage: businessCount > 0 ? `${Math.round((sicCount / businessCount) * 100)}%` : '0%',
    validated: exportData.length === batchResult.results.length
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

  // Load database results for enhanced SIC data
  let databaseResults: any[] = [];
  try {
    databaseResults = await loadAllClassificationResults();
    console.log(`[CSV EXPORTER] Loaded ${databaseResults.length} results from database for enhanced SIC data`);
  } catch (error) {
    console.warn('[CSV EXPORTER] Failed to load database results:', error);
  }

  if (!batchResult.originalFileData || batchResult.originalFileData.length !== batchResult.results.length) {
    throw new Error(`Row count mismatch: ${batchResult.results.length} results vs ${batchResult.originalFileData?.length || 0} original rows`);
  }

  // Get all possible column names from first row
  const firstOriginalRow = batchResult.originalFileData[0];
  const originalColumns = firstOriginalRow ? Object.keys(firstOriginalRow) : [];
  
  // Define classification columns including enhanced SIC fields
  const classificationColumns = [
    'classification',
    'confidence', 
    'processingTier',
    'reasoning',
    'processingMethod',
    'sicCode',
    'sicDescription',
    'keywordExclusion',
    'matchedKeywords',
    'keywordConfidence',
    'keywordReasoning',
    'timestamp'
  ];

  // Combine headers
  const headers = [...originalColumns, ...classificationColumns];
  
  // Create rows with enhanced SIC handling
  const rows: any[][] = [];
  
  for (let i = 0; i < batchResult.results.length; i++) {
    const result = batchResult.results[i];
    const originalRow = batchResult.originalFileData[i];
    
    if (!result || !originalRow) {
      throw new Error(`Missing data at index ${i}`);
    }

    // Enhanced SIC code resolution
    let sicCode = '';
    let sicDescription = '';
    
    // Try database lookup first
    const dbResultByName = databaseResults.find(db => db.payeeName === result.payeeName);
    if (dbResultByName?.result?.sicCode) {
      sicCode = dbResultByName.result.sicCode;
      sicDescription = dbResultByName.result.sicDescription || '';
    } else if (result.rowIndex !== undefined) {
      const dbResultByIndex = databaseResults.find(db => db.rowIndex === result.rowIndex);
      if (dbResultByIndex?.result?.sicCode) {
        sicCode = dbResultByIndex.result.sicCode;
        sicDescription = dbResultByIndex.result.sicDescription || '';
      }
    }
    
    // Fallback to memory data
    if (!sicCode) {
      sicCode = result.result.sicCode || '';
      sicDescription = result.result.sicDescription || '';
    }

    // Handle timestamp
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

    // Create row array in same order as headers
    const row = [];
    
    // Add original data values
    for (const column of originalColumns) {
      row.push(originalRow[column] || '');
    }
    
    // Add classification values including enhanced SIC data
    row.push(result.result.classification || 'Individual');
    row.push(result.result.confidence?.toString() || '50');
    row.push(result.result.processingTier || 'AI-Powered');
    row.push(result.result.reasoning || 'Classification result');
    row.push(result.result.processingMethod || 'OpenAI Classification');
    row.push(sicCode); // Enhanced SIC Code
    row.push(sicDescription); // Enhanced SIC Description
    row.push(result.result.keywordExclusion?.isExcluded ? 'Yes' : 'No');
    row.push(result.result.keywordExclusion?.matchedKeywords?.join('; ') || '');
    row.push(result.result.keywordExclusion?.confidence?.toString() || '0');
    row.push(result.result.keywordExclusion?.reasoning || 'No keyword exclusion applied');
    row.push(timestampString);
    
    rows.push(row);
  }

  const sicCount = rows.filter(row => row[headers.indexOf('sicCode')] && row[headers.indexOf('sicCode')] !== '').length;
  const businessCount = rows.filter(row => row[headers.indexOf('classification')] === 'Business').length;
  
  console.log('[CSV EXPORTER] Enhanced CSV export complete:', {
    headers: headers.length,
    rows: rows.length,
    businessCount: businessCount,
    sicCodesIncluded: sicCount,
    sicCoverage: businessCount > 0 ? `${Math.round((sicCount / businessCount) * 100)}%` : '0%',
    validated: rows.length === batchResult.results.length
  });

  return { headers, rows };
}
