
import { Loader2 } from "lucide-react";
import KeywordManagerHeader from "./KeywordManagerHeader";
import KeywordManagerContent from "./KeywordManagerContent";
import DuplicateTestRunner from "@/components/testing/DuplicateTestRunner";
import { useKeywordManager } from "@/hooks/useKeywordManager";

const KeywordManagerContainer = () => {
  const {
    allKeywords,
    categories,
    selectedCategory,
    editingIndex,
    editingValue,
    editingCategory,
    loading,
    saving,
    totalKeywords,
    filteredCount,
    handleAddKeyword,
    handleEditKeyword,
    handleSaveEdit,
    handleCancelEdit,
    handleDeleteKeyword,
    resetToDefaults,
    resetCategory,
    setEditingValue,
    setEditingCategory,
    setSelectedCategory
  } = useKeywordManager();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading exclusion keywords...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <KeywordManagerHeader />
      <KeywordManagerContent
        allKeywords={allKeywords}
        categories={categories}
        selectedCategory={selectedCategory}
        editingIndex={editingIndex}
        editingValue={editingValue}
        editingCategory={editingCategory}
        saving={saving}
        totalKeywords={totalKeywords}
        filteredCount={filteredCount}
        onAddKeyword={handleAddKeyword}
        onResetToDefaults={resetToDefaults}
        onResetCategory={resetCategory}
        onEdit={handleEditKeyword}
        onDelete={handleDeleteKeyword}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={handleCancelEdit}
        onEditingValueChange={setEditingValue}
        onEditingCategoryChange={setEditingCategory}
        onCategoryChange={setSelectedCategory}
      />
      
      {/* Testing Section - Development/Debugging */}
      <div className="border-t pt-6">
        <DuplicateTestRunner />
      </div>
    </div>
  );
};

export default KeywordManagerContainer;
