import { BatchProcessingResult } from '../types';
import { loadAllClassificationResults } from '../database/classificationService';
import { validateExportSICCodes } from '../database/enhancedClassificationService';

/**
 * Enhanced export with comprehensive SIC code validation and error checking
 */
export async function exportResultsWithOriginalDataV3(
  batchResult: BatchProcessingResult,
  includeAllColumns: boolean = true
): Promise<any[]> {
  console.log('[ENHANCED EXPORTER] === STARTING EXPORT WITH COMPREHENSIVE SIC VALIDATION ===');
  
  // Phase 4: Pre-export validation
  const inputBusinesses = batchResult.results.filter(r => r.result.classification === 'Business');
  const inputSicCodes = batchResult.results.filter(r => r.result.sicCode);
  
  console.log(`[ENHANCED EXPORTER] Pre-export validation: ${inputSicCodes.length}/${inputBusinesses.length} businesses have SIC codes`);
  
  if (inputBusinesses.length > 0 && inputSicCodes.length === 0) {
    console.error('[ENHANCED EXPORTER] 🚨 CRITICAL: No SIC codes found in results before export!');
  }

  // Load database results for fallback
  let databaseResults: any[] = [];
  try {
    databaseResults = await loadAllClassificationResults();
    const dbSicCount = databaseResults.filter(r => r.result?.sicCode).length;
    console.log(`[ENHANCED EXPORTER] Database fallback: ${dbSicCount} results with SIC codes available`);
  } catch (error) {
    console.warn('[ENHANCED EXPORTER] Database fallback failed:', error);
  }

  // Check if we have original file data
  if (!batchResult.originalFileData || batchResult.originalFileData.length === 0) {
    throw new Error('No original file data available for export');
  }

  console.log(`[ENHANCED EXPORTER] Processing ${batchResult.results.length} results for ${batchResult.originalFileData.length} original rows`);
  
  const exportData: any[] = [];
  let sicSourceStats = { result: 0, database: 0, original: 0, none: 0 };
  
  // Process each result with enhanced SIC validation
  for (let i = 0; i < batchResult.results.length; i++) {
    const result = batchResult.results[i];
    const originalRow = result.originalData || batchResult.originalFileData[i] || {};
    
    // Multi-source SIC resolution with validation
    let sicCode = '';
    let sicDescription = '';
    let sicSource = 'none';
    
    // Phase 4: Enhanced SIC source validation
    if (result.result.sicCode) {
      sicCode = result.result.sicCode;
      sicDescription = result.result.sicDescription || '';
      sicSource = 'result';
      sicSourceStats.result++;
      console.log(`[ENHANCED EXPORTER] ✅ SIC from result for "${result.payeeName}": ${sicCode}`);
    } else if (result.payeeName) {
      const dbResult = databaseResults.find(db => db.payeeName === result.payeeName);
      if (dbResult?.result?.sicCode) {
        sicCode = dbResult.result.sicCode;
        sicDescription = dbResult.result.sicDescription || '';
        sicSource = 'database';
        sicSourceStats.database++;
        console.log(`[ENHANCED EXPORTER] ✅ SIC from database for "${result.payeeName}": ${sicCode}`);
      }
    }
    
    if (!sicCode && originalRow.sicCode) {
      sicCode = originalRow.sicCode;
      sicDescription = originalRow.sicDescription || '';
      sicSource = 'original';
      sicSourceStats.original++;
    }
    
    if (!sicCode) {
      sicSourceStats.none++;
      if (result.result.classification === 'Business') {
        console.error(`[ENHANCED EXPORTER] ❌ Business "${result.payeeName}" missing SIC from all sources`);
      }
    }
    
    const exportRow = {
      ...originalRow,
      'classification': result.result.classification,
      'confidence': result.result.confidence,
      'processingTier': result.result.processingTier,
      'reasoning': result.result.reasoning,
      'processingMethod': result.result.processingMethod || 'OpenAI Classification',
      'sicCode': sicCode,
      'sicDescription': sicDescription,
      'sicSource': sicSource,
      'keywordExclusion': result.result.keywordExclusion?.isExcluded ? 'Yes' : 'No',
      'matchedKeywords': result.result.keywordExclusion?.matchedKeywords?.join('; ') || '',
      'keywordConfidence': result.result.keywordExclusion?.confidence?.toString() || '0',
      'keywordReasoning': result.result.keywordExclusion?.reasoning || 'No keyword exclusion applied',
      'timestamp': result.timestamp instanceof Date ? result.timestamp.toISOString() : new Date().toISOString()
    };

    exportData.push(exportRow);
  }
  
  // Phase 4: Post-export validation
  const validation = validateExportSICCodes(exportData);
  
  console.log('[ENHANCED EXPORTER] === EXPORT COMPLETE WITH COMPREHENSIVE VALIDATION ===');
  console.log('[ENHANCED EXPORTER] Export statistics:', {
    totalRows: validation.totalRows,
    businessCount: validation.businessRows,
    sicCount: validation.sicRows,
    sicCoverage: `${validation.sicCoverage}%`,
    sicSources: sicSourceStats,
    missingBusinessCount: validation.missingBusinesses.length
  });

  if (validation.sicCoverage < 50 && validation.businessRows > 0) {
    console.error(`[ENHANCED EXPORTER] 🚨 LOW SIC COVERAGE: Only ${validation.sicCoverage}% of businesses have SIC codes`);
  }

  if (validation.missingBusinesses.length > 0) {
    console.warn('[ENHANCED EXPORTER] Sample businesses missing SIC codes:', validation.missingBusinesses.slice(0, 5));
  }

  return exportData;
}

/**
 * Enhanced CSV export with validation
 */
export async function exportDirectCSV(batchResult: BatchProcessingResult): Promise<{ headers: string[]; rows: any[][] }> {
  console.log('[ENHANCED CSV EXPORTER] Starting enhanced CSV export with comprehensive validation');

  const exportData = await exportResultsWithOriginalDataV3(batchResult, true);
  const headers = exportData.length > 0 ? Object.keys(exportData[0]) : [];
  const rows: any[][] = exportData.map(row => headers.map(header => row[header] || ''));

  // Final CSV validation
  const validation = validateExportSICCodes(exportData);
  
  console.log('[ENHANCED CSV EXPORTER] Final CSV statistics:', {
    headers: headers.length,
    rows: rows.length,
    hasSicColumn: headers.includes('sicCode'),
    sicCoverage: `${validation.sicCoverage}%`,
    businessCount: validation.businessRows,
    sicCount: validation.sicRows
  });

  return { headers, rows };
}
