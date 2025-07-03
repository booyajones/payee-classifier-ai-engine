import { useToast } from "@/hooks/use-toast";
import {
  addCustomExclusionKeyword,
  updateExclusionKeyword,
  deleteExclusionKeyword,
  type ExclusionKeyword
} from "@/lib/database/exclusionKeywordService";
import { clearCustomKeywordsCache } from "@/lib/classification/keywordExclusion";

export const useKeywordOperations = () => {
  const { toast } = useToast();

  const addKeyword = async (
    keyword: string, 
    category: string = 'custom',
    allKeywords: ExclusionKeyword[],
    reloadKeywords: () => Promise<void>
  ) => {
    // Normalize inputs
    const normalizedKeyword = keyword.trim().toLowerCase();
    const normalizedCategory = category.trim().toLowerCase();
    
    // Check if keyword already exists
    if (allKeywords.some(k => k.keyword.toLowerCase() === normalizedKeyword)) {
      toast({
        title: "Duplicate Keyword",
        description: "This keyword already exists",
        variant: "destructive",
      });
      return false;
    }

    try {
      const result = await addCustomExclusionKeyword(keyword.trim(), normalizedCategory);
      
      if (result.success) {
        clearCustomKeywordsCache();
        await reloadKeywords();
        
        toast({
          title: "Keyword Added",
          description: `"${keyword}" has been added to the exclusion list`,
        });
        return true;
      } else {
        toast({
          title: "Failed to Add Keyword",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      productionLogger.error('Error adding keyword:', error);
      toast({
        title: "Error",
        description: "Failed to add keyword",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateKeyword = async (
    keywordId: string,
    newKeyword: string,
    newCategory: string,
    reloadKeywords: () => Promise<void>
  ) => {
    try {
      const result = await updateExclusionKeyword(keywordId, newKeyword, newCategory);
      
      if (result.success) {
        clearCustomKeywordsCache();
        await reloadKeywords();
        
        toast({
          title: "Keyword Updated",
          description: `Keyword has been updated to "${newKeyword}"`,
        });
        return true;
      } else {
        toast({
          title: "Failed to Update Keyword",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      productionLogger.error('Error updating keyword:', error);
      toast({
        title: "Error",
        description: "Failed to update keyword",
        variant: "destructive",
      });
      return false;
    }
  };

  const removeKeyword = async (
    keywordId: string,
    keywordText: string,
    reloadKeywords: () => Promise<void>
  ) => {
    try {
      const result = await deleteExclusionKeyword(keywordId);
      
      if (result.success) {
        clearCustomKeywordsCache();
        await reloadKeywords();
        
        toast({
          title: "Keyword Deleted",
          description: `"${keywordText}" has been removed from the exclusion list`,
        });
        return true;
      } else {
        toast({
          title: "Failed to Delete Keyword",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      productionLogger.error('Error deleting keyword:', error);
      toast({
        title: "Error",
        description: "Failed to delete keyword",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    addKeyword,
    updateKeyword,
    removeKeyword
  };
};
