
import { Loader2 } from "lucide-react";
import KeywordManagerHeader from "./KeywordManagerHeader";
import KeywordManagerContent from "./KeywordManagerContent";
import DuplicateTestRunner from "@/components/testing/DuplicateTestRunner";
import { useKeywordManager } from "@/hooks/useKeywordManager";

const KeywordManagerContainer = () => {
  const {
    comprehensiveKeywords,
    customKeywords,
    allKeywords,
    editingIndex,
    editingValue,
    loading,
    saving,
    handleAddKeyword,
    handleEditKeyword,
    handleSaveEdit,
    handleCancelEdit,
    handleDeleteKeyword,
    resetToDefaults,
    setEditingValue
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
        comprehensiveKeywords={comprehensiveKeywords}
        customKeywords={customKeywords}
        allKeywords={allKeywords}
        editingIndex={editingIndex}
        editingValue={editingValue}
        saving={saving}
        onAddKeyword={handleAddKeyword}
        onResetToDefaults={resetToDefaults}
        onEdit={handleEditKeyword}
        onDelete={handleDeleteKeyword}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={handleCancelEdit}
        onEditingValueChange={setEditingValue}
      />
      
      {/* Testing Section - Development/Debugging */}
      <div className="border-t pt-6">
        <DuplicateTestRunner />
      </div>
    </div>
  );
};

export default KeywordManagerContainer;
