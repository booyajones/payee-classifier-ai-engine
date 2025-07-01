import { supabase } from '@/integrations/supabase/client';
import { PayeeClassification } from '@/lib/types';

export interface DatabaseClassificationResult {
  id: string;
  payee_name: string;
  classification: string;
  confidence: number;
  reasoning: string;
  processing_tier: string;
  processing_method: string | null;
  matching_rules: string[] | null;
  similarity_scores: any;
  keyword_exclusion: any;
  original_data: any;
  row_index: number | null;
  batch_id: string | null;
  sic_code: string | null;
  sic_description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Save classification results to the database with enhanced SIC code tracking
 */
export const saveClassificationResults = async (
  results: PayeeClassification[],
  batchId?: string
): Promise<void> => {
  if (results.length === 0) {
    console.log('[DB SERVICE] No results to save');
    return;
  }

  console.log(`[DB SERVICE] Saving ${results.length} classification results with SIC codes to database`);
  
  // Enhanced SIC code and classification statistics
  const stats = {
    totalResults: results.length,
    businessResults: results.filter(r => r.result.classification === 'Business').length,
    individualResults: results.filter(r => r.result.classification === 'Individual').length,
    resultsWithSicCode: results.filter(r => r.result.sicCode).length,
    resultsWithSicDescription: results.filter(r => r.result.sicDescription).length
  };
  console.log('[DB SERVICE] Complete Classification Statistics:', stats);

  // Log sample classifications for debugging
  const sampleClassifications = results.slice(0, 3).map(r => ({
    payee: r.payeeName,
    classification: r.result.classification,
    confidence: r.result.confidence,
    sicCode: r.result.sicCode,
    sicDescription: r.result.sicDescription?.substring(0, 50) + '...'
  }));
  console.log('[DB SERVICE] Sample classification data:', sampleClassifications);

  // Log businesses with SIC codes
  const businessesWithSic = results.filter(r => r.result.classification === 'Business' && r.result.sicCode);
  if (businessesWithSic.length > 0) {
    console.log('[DB SERVICE] Sample businesses with SIC codes:', businessesWithSic.slice(0, 3).map(r => ({
      payee: r.payeeName,
      classification: r.result.classification,
      sicCode: r.result.sicCode,
      sicDescription: r.result.sicDescription?.substring(0, 50) + '...'
    })));
  } else {
    console.warn('[DB SERVICE] NO BUSINESSES WITH SIC CODES FOUND! Checking classification data...');
    const businesses = results.filter(r => r.result.classification === 'Business');
    console.log('[DB SERVICE] Business results without SIC:', businesses.slice(0, 3).map(r => ({
      payee: r.payeeName,
      classification: r.result.classification,
      sicCode: r.result.sicCode || 'MISSING',
      reasoning: r.result.reasoning?.substring(0, 100)
    })));
  }

  const dbRecords = results.map((result, index) => {
    const record = {
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
    
    // Enhanced debugging for each record
    console.log(`[DB SERVICE] Preparing record ${index + 1}/${results.length}: "${result.payeeName}" -> ${record.classification}${record.sic_code ? ` (SIC: ${record.sic_code})` : ''}`);
    
    return record;
  });

  console.log(`[DB SERVICE] Prepared ${dbRecords.length} database records for saving`);

  // CRITICAL FIX: Use constraint name instead of column names for onConflict
  const { error, count } = await supabase
    .from('payee_classifications')
    .upsert(dbRecords, {
      onConflict: 'idx_payee_classifications_unique',
      ignoreDuplicates: false,
      count: 'exact'
    });

  if (error) {
    console.error('[DB SERVICE] Database save failed:', error);
    console.error('[DB SERVICE] Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    throw new Error(`Failed to save classification results: ${error.message}`);
  }

  const savedCount = count || dbRecords.length;
  console.log(`[DB SERVICE] ✅ Successfully saved ${savedCount} classification results to database`);
  console.log(`[DB SERVICE] Final Summary: ${stats.resultsWithSicCode}/${stats.businessResults} businesses have SIC codes (${stats.businessResults > 0 ? Math.round((stats.resultsWithSicCode / stats.businessResults) * 100) : 0}%)`);
  console.log(`[DB SERVICE] Classification Summary: ${stats.businessResults} businesses, ${stats.individualResults} individuals`);
};

/**
 * Load all classification results from the database including SIC codes
 */
export const loadAllClassificationResults = async (): Promise<PayeeClassification[]> => {
  console.log('[DB SERVICE] Loading all classification results with SIC codes from database');

  const { data, error } = await supabase
    .from('payee_classifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[DB SERVICE] Error loading classification results:', error);
    throw new Error(`Failed to load classification results: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.log('[DB SERVICE] No classification results found in database');
    return [];
  }

  console.log(`[DB SERVICE] Loading ${data.length} classification results with SIC codes from database`);

  // Convert database records back to PayeeClassification format
  const results: PayeeClassification[] = data.map((record): PayeeClassification => ({
    id: record.id,
    payeeName: record.payee_name,
    result: {
      classification: record.classification as 'Business' | 'Individual',
      confidence: record.confidence,
      reasoning: record.reasoning,
      processingTier: record.processing_tier as any,
      processingMethod: record.processing_method || undefined,
      matchingRules: record.matching_rules || undefined,
      similarityScores: record.similarity_scores as any || undefined,
      keywordExclusion: record.keyword_exclusion as any || {
        isExcluded: false,
        matchedKeywords: [],
        confidence: 0,
        reasoning: 'No keyword exclusion applied'
      },
      sicCode: record.sic_code || undefined,
      sicDescription: record.sic_description || undefined
    },
    timestamp: new Date(record.created_at),
    originalData: record.original_data || null,
    rowIndex: record.row_index || undefined
  }));

  // Log SIC code loading statistics
  const businessResults = results.filter(r => r.result.classification === 'Business');
  const sicResults = results.filter(r => r.result.sicCode);
  console.log(`[DB SERVICE] Loaded SIC Statistics: ${sicResults.length}/${businessResults.length} businesses have SIC codes`);

  return results;
};

/**
 * Clear all classification results from the database
 */
export const clearAllClassificationResults = async (): Promise<void> => {
  console.log('[DB SERVICE] Clearing all classification results from database');

  const { error } = await supabase
    .from('payee_classifications')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

  if (error) {
    console.error('[DB SERVICE] Error clearing classification results:', error);
    throw new Error(`Failed to clear classification results: ${error.message}`);
  }

  console.log('[DB SERVICE] Successfully cleared all classification results');
};

/**
 * Migrate existing localStorage data to database
 */
export const migrateLocalStorageToDatabase = async (): Promise<boolean> => {
  try {
    const storedResults = localStorage.getItem('all_classification_results');
    if (!storedResults) {
      console.log('[DB SERVICE] No localStorage data to migrate');
      return false;
    }

    const parsedResults: PayeeClassification[] = JSON.parse(storedResults);
    if (parsedResults.length === 0) {
      console.log('[DB SERVICE] No results in localStorage to migrate');
      localStorage.removeItem('all_classification_results');
      return false;
    }

    console.log(`[DB SERVICE] Migrating ${parsedResults.length} results from localStorage to database`);

    await saveClassificationResults(parsedResults, 'localStorage-migration');
    
    // Clear localStorage after successful migration
    localStorage.removeItem('all_classification_results');
    
    console.log('[DB SERVICE] Successfully migrated localStorage data to database');
    return true;
  } catch (error) {
    console.error('[DB SERVICE] Error migrating localStorage data:', error);
    return false;
  }
};

/**
 * Get classification results count
 */
export const getClassificationResultsCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('payee_classifications')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('[DB SERVICE] Error getting results count:', error);
    return 0;
  }

  return count || 0;
};
