import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  clearCustomKeywordsCache
} from "@/lib/classification/keywordExclusion";
import { 
  addCustomExclusionKeyword,
  updateExclusionKeyword,
  deleteExclusionKeyword,
  getAllCustomExclusionKeywords,
  loadAllExclusionKeywords,
  resetKeywordsByCategory,
  getKeywordCategories,
  type ExclusionKeyword
} from "@/lib/database/exclusionKeywordService";

export const useKeywordManager = () => {
  const [allKeywords, setAllKeywords] = useState<ExclusionKeyword[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [editingCategory, setEditingCategory] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Load keywords from database
  const loadKeywords = async () => {
    try {
      setLoading(true);
      
      // Load all keywords from database
      const allKeywordData = await loadAllExclusionKeywords();
      setAllKeywords(allKeywordData);
      
      // Load categories
      const categoryData = await getKeywordCategories();
      setCategories(['all', ...categoryData]);
      
      console.log(`[KEYWORD EXCLUSION MANAGER] Loaded ${allKeywordData.length} total keywords with ${categoryData.length} categories`);
    } catch (error) {
      console.error('Error loading keywords:', error);
      toast({
        title: "Loading Error",
        description: "Failed to load exclusion keywords",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get filtered keywords based on selected category
  const getFilteredKeywords = () => {
    if (selectedCategory === 'all') {
      return allKeywords;
    }
    return allKeywords.filter(k => k.category === selectedCategory);
  };

  const handleAddKeyword = async (keyword: string, category: string = 'custom') => {
    // Check if keyword already exists
    if (allKeywords.some(k => k.keyword.toLowerCase() === keyword.toLowerCase())) {
      toast({
        title: "Duplicate Keyword",
        description: "This keyword already exists",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const result = await addCustomExclusionKeyword(keyword, category);
      
      if (result.success) {
        // Clear cache and reload keywords
        clearCustomKeywordsCache();
        await loadKeywords();
        
        toast({
          title: "Keyword Added",
          description: `"${keyword}" has been added to the exclusion list`,
        });
      } else {
        toast({
          title: "Failed to Add Keyword",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error adding keyword:', error);
      toast({
        title: "Error",
        description: "Failed to add keyword",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditKeyword = (index: number) => {
    const keyword = getFilteredKeywords()[index];
    setEditingIndex(index);
    setEditingValue(keyword.keyword);
    setEditingCategory(keyword.category);
  };

  const handleSaveEdit = async () => {
    if (editingIndex === null) return;

    if (!editingValue.trim()) {
      toast({
        title: "Invalid Keyword",
        description: "Please enter a valid keyword",
        variant: "destructive",
      });
      return;
    }

    const trimmedValue = editingValue.trim();
    const trimmedCategory = editingCategory.trim();
    const keywordToEdit = getFilteredKeywords()[editingIndex];

    try {
      setSaving(true);
      const result = await updateExclusionKeyword(keywordToEdit.id, trimmedValue, trimmedCategory);
      
      if (result.success) {
        // Clear cache and reload keywords
        clearCustomKeywordsCache();
        await loadKeywords();
        setEditingIndex(null);
        setEditingValue("");
        setEditingCategory("");
        
        toast({
          title: "Keyword Updated",
          description: `Keyword has been updated to "${trimmedValue}"`,
        });
      } else {
        toast({
          title: "Failed to Update Keyword",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating keyword:', error);
      toast({
        title: "Error",
        description: "Failed to update keyword",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingValue("");
    setEditingCategory("");
  };

  const handleDeleteKeyword = async (index: number) => {
    const keywordToDelete = getFilteredKeywords()[index];

    try {
      setSaving(true);
      const result = await deleteExclusionKeyword(keywordToDelete.id);
      
      if (result.success) {
        // Clear cache and reload keywords
        clearCustomKeywordsCache();
        await loadKeywords();
        
        toast({
          title: "Keyword Deleted",
          description: `"${keywordToDelete.keyword}" has been removed from the exclusion list`,
        });
      } else {
        toast({
          title: "Failed to Delete Keyword",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting keyword:', error);
      toast({
        title: "Error",
        description: "Failed to delete keyword",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    try {
      setSaving(true);
      
      // Delete all custom keywords
      const customKeywords = allKeywords.filter(k => k.keyword_type === 'custom');
      const deletePromises = customKeywords.map(keyword => 
        deleteExclusionKeyword(keyword.id)
      );
      
      await Promise.all(deletePromises);
      
      // Clear cache and reload keywords
      clearCustomKeywordsCache();
      await loadKeywords();
      
      toast({
        title: "Reset Complete",
        description: "All custom keywords have been removed. Only built-in keywords remain.",
      });
    } catch (error) {
      console.error('Error resetting keywords:', error);
      toast({
        title: "Error",
        description: "Failed to reset keywords",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetCategory = async (category: string) => {
    try {
      setSaving(true);
      const result = await resetKeywordsByCategory(category);
      
      if (result.success) {
        // Clear cache and reload keywords
        clearCustomKeywordsCache();
        await loadKeywords();
        
        toast({
          title: "Category Reset",
          description: `"${category}" category has been reset to defaults`,
        });
      } else {
        toast({
          title: "Failed to Reset Category",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error resetting category:', error);
      toast({
        title: "Error",
        description: "Failed to reset category",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadKeywords();
  }, []);

  return {
    // State
    allKeywords: getFilteredKeywords(),
    categories,
    selectedCategory,
    editingIndex,
    editingValue,
    editingCategory,
    loading,
    saving,
    
    // Actions
    handleAddKeyword,
    handleEditKeyword,
    handleSaveEdit,
    handleCancelEdit,
    handleDeleteKeyword,
    resetToDefaults,
    resetCategory,
    setEditingValue,
    setEditingCategory,
    setSelectedCategory,
    
    // Computed
    totalKeywords: allKeywords.length,
    filteredCount: getFilteredKeywords().length
  };
};