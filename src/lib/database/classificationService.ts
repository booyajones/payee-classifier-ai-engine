
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
  created_at: string;
  updated_at: string;
}

/**
 * Save classification results to the database
 */
export const saveClassificationResults = async (
  results: PayeeClassification[],
  batchId?: string
): Promise<void> => {
  if (results.length === 0) {
    console.log('[DB SERVICE] No results to save');
    return;
  }

  console.log(`[DB SERVICE] Saving ${results.length} classification results to database`);

  const dbRecords = results.map((result) => ({
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
  }));

  // Use upsert to handle conflicts based on unique constraint
  const { error } = await supabase
    .from('payee_classifications')
    .upsert(dbRecords, {
      onConflict: 'payee_name,row_index,batch_id',
      ignoreDuplicates: false
    });

  if (error) {
    console.error('[DB SERVICE] Error saving classification results:', error);
    throw new Error(`Failed to save classification results: ${error.message}`);
  }

  console.log(`[DB SERVICE] Successfully saved ${results.length} classification results`);
};

/**
 * Load all classification results from the database
 */
export const loadAllClassificationResults = async (): Promise<PayeeClassification[]> => {
  console.log('[DB SERVICE] Loading all classification results from database');

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

  console.log(`[DB SERVICE] Loaded ${data.length} classification results from database`);

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
      }
    },
    timestamp: new Date(record.created_at),
    originalData: record.original_data || null,
    rowIndex: record.row_index || undefined
  }));

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
