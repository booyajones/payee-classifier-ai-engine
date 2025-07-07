
import { supabase } from '@/integrations/supabase/client';
import { PayeeClassification } from '@/lib/types';

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

  // CRITICAL FIX: Use proper upsert logic to handle duplicate detection data updates
  let successfulInserts = 0;
  let duplicateUpdates = 0;
  
  for (const record of validatedResults) {
    try {
      // First try to insert the record
      const { error: insertError } = await supabase
        .from('payee_classifications')
        .insert([record]);
      
      if (insertError && insertError.code === '23505') {
        // Unique constraint violation - update existing record with duplicate detection data
        const { error: updateError } = await supabase
          .from('payee_classifications')
          .update({
            // Update duplicate detection fields specifically
            is_potential_duplicate: record.is_potential_duplicate,
            duplicate_of_payee_id: record.duplicate_of_payee_id,
            duplicate_confidence_score: record.duplicate_confidence_score,
            duplicate_detection_method: record.duplicate_detection_method,
            duplicate_group_id: record.duplicate_group_id,
            ai_duplicate_reasoning: record.ai_duplicate_reasoning,
            // Also update other fields that might have changed
            classification: record.classification,
            confidence: record.confidence,
            reasoning: record.reasoning,
            sic_code: record.sic_code,
            sic_description: record.sic_description
          })
          .eq('payee_name', record.payee_name)
          .eq('batch_id', record.batch_id)
          .eq('row_index', record.row_index);
        
        if (updateError) {
          console.error(`[ENHANCED DB SERVICE] Update failed for "${record.payee_name}":`, updateError.message);
          stats.sicValidationErrors.push(`Update failed for "${record.payee_name}": ${updateError.message}`);
        } else {
          duplicateUpdates++;
          console.log(`[ENHANCED DB SERVICE] Updated duplicate detection data for: "${record.payee_name}"`);
        }
      } else if (insertError) {
        console.error(`[ENHANCED DB SERVICE] Insert failed for "${record.payee_name}":`, insertError.message);
        stats.sicValidationErrors.push(`Insert failed for "${record.payee_name}": ${insertError.message}`);
      } else {
        successfulInserts++;
      }
    } catch (unexpectedError) {
      console.error(`[ENHANCED DB SERVICE] Unexpected error for "${record.payee_name}":`, unexpectedError);
      stats.sicValidationErrors.push(`Unexpected error for "${record.payee_name}": ${unexpectedError}`);
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
