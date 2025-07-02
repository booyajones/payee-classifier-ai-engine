import { useState, useEffect } from "react";
import { useKeywordData } from "./useKeywordData";
import { useKeywordOperations } from "./keywordOperations";
import { useCategoryOperations } from "./categoryOperations";
import { getFilteredKeywords, findKeywordById } from "./utils";
import type { KeywordManagerReturn } from "./types";

export const useKeywordManager = (): KeywordManagerReturn => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [editingCategory, setEditingCategory] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [saving, setSaving] = useState(false);

  const { allKeywords, categories, loading, loadKeywords } = useKeywordData();
  const { addKeyword, updateKeyword, removeKeyword } = useKeywordOperations();
  const { resetAllCustomKeywords, resetCategoryToDefaults } = useCategoryOperations();

  // Get filtered keywords based on selected category
  const filteredKeywords = getFilteredKeywords(allKeywords, selectedCategory);

  const handleAddKeyword = async (keyword: string, category: string = 'custom') => {
    setSaving(true);
    const success = await addKeyword(keyword, category, allKeywords, loadKeywords);
    setSaving(false);
  };

  const handleEditKeyword = (index: number) => {
    const keyword = findKeywordById(allKeywords, selectedCategory, index);
    if (keyword) {
      setEditingIndex(index);
      setEditingValue(keyword.keyword);
      setEditingCategory(keyword.category);
    }
  };

  const handleSaveEdit = async () => {
    if (editingIndex === null) return;

    if (!editingValue.trim()) {
      return;
    }

    const keywordToEdit = findKeywordById(allKeywords, selectedCategory, editingIndex);
    if (!keywordToEdit) return;

    setSaving(true);
    const success = await updateKeyword(
      keywordToEdit.id,
      editingValue.trim(),
      editingCategory.trim(),
      loadKeywords
    );
    
    if (success) {
      setEditingIndex(null);
      setEditingValue("");
      setEditingCategory("");
    }
    setSaving(false);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingValue("");
    setEditingCategory("");
  };

  const handleDeleteKeyword = async (index: number) => {
    const keywordToDelete = findKeywordById(allKeywords, selectedCategory, index);
    if (!keywordToDelete) return;

    setSaving(true);
    await removeKeyword(keywordToDelete.id, keywordToDelete.keyword, loadKeywords);
    setSaving(false);
  };

  const resetToDefaults = async () => {
    setSaving(true);
    await resetAllCustomKeywords(allKeywords, loadKeywords);
    setSaving(false);
  };

  const resetCategory = async (category: string) => {
    setSaving(true);
    await resetCategoryToDefaults(category, loadKeywords);
    setSaving(false);
  };

  useEffect(() => {
    loadKeywords();
  }, [loadKeywords]);

  return {
    // State
    allKeywords: filteredKeywords,
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
    filteredCount: filteredKeywords.length
  };
};

// Re-export types for convenience
export type { KeywordManagerReturn } from "./types";