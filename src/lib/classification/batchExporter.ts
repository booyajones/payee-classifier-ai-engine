
import { BatchProcessingResult } from '../types';
import { loadAllClassificationResults } from '../database/classificationService';

/**
 * Export that preserves original data and adds classification results with SIC codes from database
 */
export async function exportResultsWithOriginalDataV3(
  batchResult: BatchProcessingResult,
  includeAllColumns: boolean = true
): Promise<any[]> {
  console.log('[BATCH EXPORTER] Starting export with database SIC data validation:', {
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
  
  // Simple 1:1 mapping with enhanced SIC data from database
  for (let i = 0; i < batchResult.results.length; i++) {
    const result = batchResult.results[i];
    const originalRow = batchResult.originalFileData[i];
    
    if (!result || !originalRow) {
      throw new Error(`Missing data at index ${i}: result=${!!result}, originalRow=${!!originalRow}`);
    }
    
    // Try to find matching database result for enhanced SIC data
    const dbResult = databaseResults.find(db => 
      db.payeeName === result.payeeName || 
      (db.rowIndex === result.rowIndex && db.rowIndex !== undefined)
    );
    
    // Use database SIC data if available, otherwise fall back to memory data
    const sicCode = dbResult?.result?.sicCode || result.result.sicCode || '';
    const sicDescription = dbResult?.result?.sicDescription || result.result.sicDescription || '';
    
    console.log(`[BATCH EXPORTER] Row ${i}: ${result.payeeName} - SIC: ${sicCode} (from ${dbResult ? 'database' : 'memory'})`);
    
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
    
    // Create export row: original data + classification columns + SIC data
    const exportRow = {
      // Preserve ALL original columns exactly as they were
      ...originalRow,
      
      // Add classification results with consistent camelCase naming
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
      'timestamp': timestampString
    };

    exportData.push(exportRow);
  }

  // FINAL VALIDATION
  if (exportData.length !== batchResult.results.length) {
    throw new Error(`Export count mismatch: created ${exportData.length} rows from ${batchResult.results.length} results`);
  }

  const sicCount = exportData.filter(row => row.sicCode && row.sicCode !== '').length;
  console.log('[BATCH EXPORTER] Export complete with enhanced SIC data:', {
    inputRows: batchResult.results.length,
    outputRows: exportData.length,
    sicCodesIncluded: sicCount,
    validated: exportData.length === batchResult.results.length
  });

  return exportData;
}

/**
 * Direct CSV export with SIC data from database
 */
export async function exportDirectCSV(batchResult: BatchProcessingResult): Promise<{ headers: string[]; rows: any[][] }> {
  console.log('[CSV EXPORTER] Starting direct CSV export with database SIC data:', {
    resultsLength: batchResult.results.length,
    originalDataLength: batchResult.originalFileData?.length || 0
  });

  // Load database results for SIC data
  let databaseResults: any[] = [];
  try {
    databaseResults = await loadAllClassificationResults();
    console.log(`[CSV EXPORTER] Loaded ${databaseResults.length} results from database for SIC data`);
  } catch (error) {
    console.warn('[CSV EXPORTER] Failed to load database results:', error);
  }

  if (!batchResult.originalFileData || batchResult.originalFileData.length !== batchResult.results.length) {
    throw new Error(`Row count mismatch: ${batchResult.results.length} results vs ${batchResult.originalFileData?.length || 0} original rows`);
  }

  // Get all possible column names from first row
  const firstOriginalRow = batchResult.originalFileData[0];
  const originalColumns = firstOriginalRow ? Object.keys(firstOriginalRow) : [];
  
  // Define classification columns including SIC fields
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
  
  // Create rows
  const rows: any[][] = [];
  
  for (let i = 0; i < batchResult.results.length; i++) {
    const result = batchResult.results[i];
    const originalRow = batchResult.originalFileData[i];
    
    if (!result || !originalRow) {
      throw new Error(`Missing data at index ${i}`);
    }

    // Find matching database result for SIC data
    const dbResult = databaseResults.find(db => 
      db.payeeName === result.payeeName || 
      (db.rowIndex === result.rowIndex && db.rowIndex !== undefined)
    );
    
    // Use database SIC data if available
    const sicCode = dbResult?.result?.sicCode || result.result.sicCode || '';
    const sicDescription = dbResult?.result?.sicDescription || result.result.sicDescription || '';

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
    
    // Add classification values including SIC data
    row.push(result.result.classification || 'Individual');
    row.push(result.result.confidence?.toString() || '50');
    row.push(result.result.processingTier || 'AI-Powered');
    row.push(result.result.reasoning || 'Classification result');
    row.push(result.result.processingMethod || 'OpenAI Classification');
    row.push(sicCode); // SIC Code from database
    row.push(sicDescription); // SIC Description from database
    row.push(result.result.keywordExclusion?.isExcluded ? 'Yes' : 'No');
    row.push(result.result.keywordExclusion?.matchedKeywords?.join('; ') || '');
    row.push(result.result.keywordExclusion?.confidence?.toString() || '0');
    row.push(result.result.keywordExclusion?.reasoning || 'No keyword exclusion applied');
    row.push(timestampString);
    
    rows.push(row);
  }

  const sicCount = rows.filter(row => row[headers.indexOf('sicCode')] && row[headers.indexOf('sicCode')] !== '').length;
  console.log('[CSV EXPORTER] CSV export complete with SIC data:', {
    headers: headers.length,
    rows: rows.length,
    sicCodesIncluded: sicCount,
    validated: rows.length === batchResult.results.length
  });

  return { headers, rows };
}
