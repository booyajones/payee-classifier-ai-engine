
import { supabase } from "@/integrations/supabase/client";

export interface ExclusionKeyword {
  id: string;
  keyword: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Load all active custom exclusion keywords from the database
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
 * Add a new custom exclusion keyword
 */
export async function addCustomExclusionKeyword(keyword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('exclusion_keywords')
      .insert([{ keyword: keyword.trim() }]);

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
 * Update an existing custom exclusion keyword
 */
export async function updateCustomExclusionKeyword(id: string, newKeyword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('exclusion_keywords')
      .update({ keyword: newKeyword.trim(), updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return { success: false, error: 'Keyword already exists' };
      }
      console.error('Error updating custom exclusion keyword:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating custom exclusion keyword:', error);
    return { success: false, error: 'Failed to update keyword' };
  }
}

/**
 * Delete a custom exclusion keyword
 */
export async function deleteCustomExclusionKeyword(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('exclusion_keywords')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting custom exclusion keyword:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting custom exclusion keyword:', error);
    return { success: false, error: 'Failed to delete keyword' };
  }
}

/**
 * Get all custom exclusion keywords with metadata
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

    return data || [];
  } catch (error) {
    console.error('Error loading all custom exclusion keywords:', error);
    return [];
  }
}
