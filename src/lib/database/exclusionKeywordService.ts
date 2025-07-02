import { supabase } from "@/integrations/supabase/client";

export interface ExclusionKeyword {
  id: string;
  keyword: string;
  is_active: boolean;
  keyword_type: 'builtin' | 'custom' | 'modified_builtin';
  category: string;
  created_at: string;
  updated_at: string;
}

/**
 * Load all active exclusion keywords from the database
 */
export async function loadCustomExclusionKeywords(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('exclusion_keywords')
      .select('keyword')
      .eq('is_active', true)
      .order('keyword');

    if (error) {
      console.error('Error loading custom exclusion keywords:', error);
      return [];
    }

    return data?.map(item => item.keyword) || [];
  } catch (error) {
    console.error('Error loading custom exclusion keywords:', error);
    return [];
  }
}

/**
 * Load all active exclusion keywords from the database with full data
 */
export async function loadAllExclusionKeywords(): Promise<ExclusionKeyword[]> {
  try {
    const { data, error } = await supabase
      .from('exclusion_keywords')
      .select('*')
      .eq('is_active', true)
      .order('category, keyword');

    if (error) {
      console.error('Error loading all exclusion keywords:', error);
      return [];
    }

    return (data || []) as ExclusionKeyword[];
  } catch (error) {
    console.error('Error loading all exclusion keywords:', error);
    return [];
  }
}

/**
 * Add a new custom exclusion keyword
 */
export async function addCustomExclusionKeyword(
  keyword: string, 
  category: string = 'custom'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('exclusion_keywords')
      .insert([{ 
        keyword: keyword.trim(), 
        keyword_type: 'custom',
        category: category.trim()
      }]);

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return { success: false, error: 'Keyword already exists' };
      }
      console.error('Error adding custom exclusion keyword:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error adding custom exclusion keyword:', error);
    return { success: false, error: 'Failed to add keyword' };
  }
}

/**
 * Update an existing exclusion keyword (any type)
 */
export async function updateExclusionKeyword(
  id: string, 
  newKeyword: string, 
  category?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = { 
      keyword: newKeyword.trim(), 
      updated_at: new Date().toISOString() 
    };
    
    if (category) {
      updateData.category = category.trim();
    }

    const { error } = await supabase
      .from('exclusion_keywords')
      .update(updateData)
      .eq('id', id);

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return { success: false, error: 'Keyword already exists' };
      }
      console.error('Error updating exclusion keyword:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating exclusion keyword:', error);
    return { success: false, error: 'Failed to update keyword' };
  }
}

/**
 * Delete any exclusion keyword
 */
export async function deleteExclusionKeyword(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('exclusion_keywords')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting exclusion keyword:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting exclusion keyword:', error);
    return { success: false, error: 'Failed to delete keyword' };
  }
}

/**
 * Get all exclusion keywords with metadata
 */
export async function getAllCustomExclusionKeywords(): Promise<ExclusionKeyword[]> {
  try {
    const { data, error } = await supabase
      .from('exclusion_keywords')
      .select('*')
      .order('keyword');

    if (error) {
      console.error('Error loading all custom exclusion keywords:', error);
      return [];
    }

    return (data || []) as ExclusionKeyword[];
  } catch (error) {
    console.error('Error loading all custom exclusion keywords:', error);
    return [];
  }
}

/**
 * Reset keywords by category to their original built-in state
 */
export async function resetKeywordsByCategory(category: string): Promise<{ success: boolean; error?: string }> {
  try {
    // First, delete all custom/modified keywords in this category
    const { error: deleteError } = await supabase
      .from('exclusion_keywords')
      .delete()
      .eq('category', category)
      .neq('keyword_type', 'builtin');

    if (deleteError) {
      console.error('Error resetting keywords by category:', deleteError);
      return { success: false, error: deleteError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error resetting keywords by category:', error);
    return { success: false, error: 'Failed to reset category' };
  }
}

/**
 * Get available categories
 */
export async function getKeywordCategories(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('exclusion_keywords')
      .select('category')
      .eq('is_active', true);

    if (error) {
      console.error('Error loading keyword categories:', error);
      return [];
    }

    const categories = [...new Set(data?.map(item => item.category) || [])];
    return categories.sort();
  } catch (error) {
    console.error('Error loading keyword categories:', error);
    return [];
  }
}