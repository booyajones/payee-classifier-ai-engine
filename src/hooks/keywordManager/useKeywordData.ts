import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  loadAllExclusionKeywords,
  getKeywordCategories,
  type ExclusionKeyword
} from "@/lib/database/exclusionKeywordService";

export const useKeywordData = () => {
  const [allKeywords, setAllKeywords] = useState<ExclusionKeyword[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadKeywords = useCallback(async () => {
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
  }, [toast]);

  return {
    allKeywords,
    categories,
    loading,
    loadKeywords
  };
};