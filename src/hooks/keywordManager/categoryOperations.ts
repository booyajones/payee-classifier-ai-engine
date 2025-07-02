import { useToast } from "@/hooks/use-toast";
import {
  deleteExclusionKeyword,
  resetKeywordsByCategory,
  type ExclusionKeyword
} from "@/lib/database/exclusionKeywordService";
import { clearCustomKeywordsCache } from "@/lib/classification/keywordExclusion";

export const useCategoryOperations = () => {
  const { toast } = useToast();

  const resetAllCustomKeywords = async (
    allKeywords: ExclusionKeyword[],
    reloadKeywords: () => Promise<void>
  ) => {
    try {
      // Delete all custom keywords
      const customKeywords = allKeywords.filter(k => k.keyword_type === 'custom');
      const deletePromises = customKeywords.map(keyword => 
        deleteExclusionKeyword(keyword.id)
      );
      
      await Promise.all(deletePromises);
      
      clearCustomKeywordsCache();
      await reloadKeywords();
      
      toast({
        title: "Reset Complete",
        description: "All custom keywords have been removed. Only built-in keywords remain.",
      });
      return true;
    } catch (error) {
      console.error('Error resetting keywords:', error);
      toast({
        title: "Error",
        description: "Failed to reset keywords",
        variant: "destructive",
      });
      return false;
    }
  };

  const resetCategoryToDefaults = async (
    category: string,
    reloadKeywords: () => Promise<void>
  ) => {
    try {
      const result = await resetKeywordsByCategory(category);
      
      if (result.success) {
        clearCustomKeywordsCache();
        await reloadKeywords();
        
        toast({
          title: "Category Reset",
          description: `"${category}" category has been reset to defaults`,
        });
        return true;
      } else {
        toast({
          title: "Failed to Reset Category",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Error resetting category:', error);
      toast({
        title: "Error",
        description: "Failed to reset category",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    resetAllCustomKeywords,
    resetCategoryToDefaults
  };
};