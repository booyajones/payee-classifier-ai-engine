
import { supabase } from '@/integrations/supabase/client';
import { PayeeClassification } from '@/lib/types';
import { exponentialBackoff, createCircuitBreaker, DatabaseError } from './resilientDatabase';

interface SICValidationStats {
  totalSaved: number;
  businessCount: number;
  individualCount: number;
  sicCodeCount: number;
  sicValidationErrors: string[];
}

/**
 * Enhanced classification service with SIC code validation
 */
export const saveClassificationResultsWithValidation = async (
  results: PayeeClassification[],
  batchId?: string
): Promise<SICValidationStats> => {
  console.log(`[ENHANCED DB SERVICE] Saving ${results.length} results with comprehensive SIC and classification validation`);
  
  const stats: SICValidationStats = {
    totalSaved: 0,
    businessCount: 0,
    individualCount: 0,
    sicCodeCount: 0,
    sicValidationErrors: []
  };

  if (results.length === 0) {
    console.log('[ENHANCED DB SERVICE] No results to save');
    return stats;
  }

  // Enhanced pre-save validation for both classification types
  const validatedResults = results.map((result, index) => {
    const isBusiness = result.result.classification === 'Business';
    const isIndividual = result.result.classification === 'Individual';
    
    if (isBusiness) {
      stats.businessCount++;
      
      if (result.result.sicCode) {
        stats.sicCodeCount++;
        console.log(`[ENHANCED DB SERVICE] ✅ Business validation: "${result.payeeName}" has SIC: ${result.result.sicCode}`);
      } else {
        const error = `Business "${result.payeeName}" missing SIC code before database save`;
        stats.sicValidationErrors.push(error);
        console.error(`[ENHANCED DB SERVICE] ❌ ${error}`);
      }
    } else if (isIndividual) {
      stats.individualCount++;
      console.log(`[ENHANCED DB SERVICE] ✅ Individual validation: "${result.payeeName}" classified as Individual`);
    } else {
      const error = `Unknown classification "${result.result.classification}" for "${result.payeeName}"`;
      stats.sicValidationErrors.push(error);
      console.error(`[ENHANCED DB SERVICE] ❌ ${error}`);
    }

    // CRITICAL FIX: Transform NULL values to match COALESCE constraint logic
    // The unique constraint uses COALESCE(row_index, '-1'::integer) and COALESCE(batch_id, ''::text)
    const processedRowIndex = result.rowIndex !== null && result.rowIndex !== undefined ? result.rowIndex : -1;
    const processedBatchId = batchId || '';

    return {
      payee_name: result.payeeName,
      classification: result.result.classification,
      confidence: result.result.confidence,
      reasoning: result.result.reasoning,
      processing_tier: result.result.processingTier,
      processing_method: result.result.processingMethod || null,
      matching_rules: result.result.matchingRules || null,
      similarity_scores: result.result.similarityScores ? JSON.parse(JSON.stringify(result.result.similarityScores)) : null,
      keyword_exclusion: result.result.keywordExclusion ? JSON.parse(JSON.stringify(result.result.keywordExclusion)) : null,
      original_data: result.originalData ? JSON.parse(JSON.stringify(result.originalData)) : null,
      row_index: processedRowIndex,
      batch_id: processedBatchId,
      sic_code: result.result.sicCode || null,
      sic_description: result.result.sicDescription || null,
      // DUPLICATE DETECTION DATA - check if available in result object
      is_potential_duplicate: (result as any).is_potential_duplicate || false,
      duplicate_of_payee_id: (result as any).duplicate_of_payee_id || null,
      duplicate_confidence_score: (result as any).duplicate_confidence_score || 0,
      duplicate_detection_method: (result as any).duplicate_detection_method || 'Not Analyzed',
      duplicate_group_id: (result as any).duplicate_group_id || null,
      ai_duplicate_reasoning: (result as any).ai_duplicate_reasoning || null,
    };
  });

  console.log(`[ENHANCED DB SERVICE] Validation complete: ${stats.businessCount} businesses, ${stats.individualCount} individuals, ${stats.sicCodeCount} with SIC codes`);

  // RESILIENT DATABASE: Use circuit breaker and exponential backoff
  const circuitBreaker = createCircuitBreaker(3, 30000); // 3 failures, 30s recovery
  let successfulInserts = 0;
  let duplicateUpdates = 0;
  
  // Process records in smaller batches to reduce database load
  const BATCH_SIZE = 10;
  for (let i = 0; i < validatedResults.length; i += BATCH_SIZE) {
    const batchRecords = validatedResults.slice(i, i + BATCH_SIZE);
    
    for (const record of batchRecords) {
      try {
        await circuitBreaker(async () => {
          // Use efficient upsert to eliminate constraint violations and improve performance
          await exponentialBackoff(async () => {
            // EMERGENCY FIX: Use .insert() with error handling instead of upsert for constraint issues
            // This prevents the database constraint violations that are causing unresponsiveness
            let { error } = await supabase
              .from('payee_classifications')
              .insert([record]);
            
            // If duplicate, try update with proper where clause
            if (error?.code === '23505') {
              const { error: updateError } = await supabase
                .from('payee_classifications')
                .update(record)
                .eq('payee_name', record.payee_name)
                .eq('batch_id', record.batch_id || '')
                .eq('row_index', record.row_index);
              
              error = updateError;
            }
            
            if (error) {
              throw new DatabaseError(`Upsert failed for "${record.payee_name}": ${error.message}`, error.code, true);
            } else {
              successfulInserts++;
            }
          }, `Save classification for ${record.payee_name}`, { maxRetries: 2, baseDelay: 500 });
        }, `Circuit breaker for ${record.payee_name}`);
        
      } catch (error) {
        if (error instanceof DatabaseError && error.code === 'CIRCUIT_OPEN') {
          console.error(`[RESILIENT DB] Circuit breaker is open - stopping batch processing`);
          stats.sicValidationErrors.push(`Circuit breaker activated - remaining records not processed`);
          break; // Stop processing this batch
        } else {
          console.error(`[RESILIENT DB] Final failure for "${record.payee_name}":`, error);
          stats.sicValidationErrors.push(`Final failure for "${record.payee_name}": ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
    
    // Add small delay between batches to prevent overwhelming the database
    if (i + BATCH_SIZE < validatedResults.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  stats.totalSaved = successfulInserts + duplicateUpdates;
  
  if (duplicateUpdates > 0) {
    console.log(`[ENHANCED DB SERVICE] Updated ${duplicateUpdates} existing records with duplicate detection data, saved ${successfulInserts} new records`);
  }
  
  if (stats.sicValidationErrors.length > 0) {
    console.warn(`[ENHANCED DB SERVICE] ${stats.sicValidationErrors.length} errors occurred during save (but processing continued)`);
  }

  // Post-save validation
  if (batchId) {
    const { data: savedData, error: fetchError } = await supabase
      .from('payee_classifications')
      .select('payee_name, classification, sic_code')
      .eq('batch_id', batchId);

    if (!fetchError && savedData) {
      const savedBusinessCount = savedData.filter(r => r.classification === 'Business').length;
      const savedIndividualCount = savedData.filter(r => r.classification === 'Individual').length;
      const savedSicCount = savedData.filter(r => r.sic_code).length;
      
      console.log(`[ENHANCED DB SERVICE] Post-save validation: ${savedSicCount}/${savedBusinessCount} businesses have SIC codes in database`);
      console.log(`[ENHANCED DB SERVICE] Post-save validation: ${savedBusinessCount} businesses, ${savedIndividualCount} individuals saved`);
      
      if (savedSicCount !== stats.sicCodeCount) {
        const error = `SIC code count mismatch after save: expected ${stats.sicCodeCount}, found ${savedSicCount}`;
        stats.sicValidationErrors.push(error);
        console.error(`[ENHANCED DB SERVICE] ❌ ${error}`);
      }
    }
  }

  const sicCoverage = stats.businessCount > 0 ? Math.round((stats.sicCodeCount / stats.businessCount) * 100) : 0;
  console.log(`[ENHANCED DB SERVICE] ✅ Save complete with validation: ${stats.sicCodeCount}/${stats.businessCount} businesses (${sicCoverage}%) have SIC codes`);
  console.log(`[ENHANCED DB SERVICE] ✅ Classification summary: ${stats.businessCount} businesses, ${stats.individualCount} individuals saved successfully`);

  return stats;
};

/**
 * Validate SIC codes in export data
 */
export const validateExportSICCodes = (exportData: any[]): {
  totalRows: number;
  businessRows: number;
  sicRows: number;
  sicCoverage: number;
  missingBusinesses: string[];
} => {
  const businessRows = exportData.filter(row => row.classification === 'Business');
  const sicRows = exportData.filter(row => row.sicCode && row.sicCode !== '');
  const missingBusinesses = businessRows
    .filter(row => !row.sicCode || row.sicCode === '')
    .map(row => row.payeeName || row.original_payee_name || 'Unknown')
    .slice(0, 10); // Limit to first 10 for logging

  const sicCoverage = businessRows.length > 0 ? Math.round((sicRows.length / businessRows.length) * 100) : 0;

  console.log(`[EXPORT VALIDATOR] SIC validation: ${sicRows.length}/${businessRows.length} businesses (${sicCoverage}%) have SIC codes`);
  
  if (missingBusinesses.length > 0) {
    console.warn(`[EXPORT VALIDATOR] Businesses missing SIC codes:`, missingBusinesses);
  }

  return {
    totalRows: exportData.length,
    businessRows: businessRows.length,
    sicRows: sicRows.length,
    sicCoverage,
    missingBusinesses
  };
};
