
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
      row_index: result.rowIndex || null,
      batch_id: batchId || null,
      sic_code: result.result.sicCode || null,
      sic_description: result.result.sicDescription || null,
    };
  });

  console.log(`[ENHANCED DB SERVICE] Validation complete: ${stats.businessCount} businesses, ${stats.individualCount} individuals, ${stats.sicCodeCount} with SIC codes`);

  // CRITICAL FIX: Use constraint name instead of column names for onConflict
  const { error, count } = await supabase
    .from('payee_classifications')
    .upsert(validatedResults, {
      onConflict: 'idx_payee_classifications_unique',
      ignoreDuplicates: false,
      count: 'exact'
    });

  if (error) {
    console.error('[ENHANCED DB SERVICE] Database save failed:', error);
    console.error('[ENHANCED DB SERVICE] Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    throw new Error(`Failed to save classification results: ${error.message}`);
  }

  stats.totalSaved = count || validatedResults.length;

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
