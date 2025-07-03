import { type ExclusionKeyword } from "@/lib/database/exclusionKeywordService";

export const getFilteredKeywords = (
  allKeywords: ExclusionKeyword[],
  selectedCategory: string
): ExclusionKeyword[] => {
  if (selectedCategory === 'all') {
    return allKeywords;
  }
  return allKeywords.filter(k => k.category === selectedCategory);
};

export const getKeywordStatistics = (allKeywords: ExclusionKeyword[]) => {
  const builtinCount = allKeywords.filter(k => k.keyword_type === 'builtin').length;
  const customCount = allKeywords.filter(k => k.keyword_type === 'custom').length;
  const categories = [...new Set(allKeywords.map(k => k.category))];
  
  return {
    builtinCount,
    customCount,
    totalCount: allKeywords.length,
    categoryCount: categories.length,
    categories: categories.sort()
  };
};

export const findKeywordById = (
  allKeywords: ExclusionKeyword[],
  selectedCategory: string,
  index: number
): ExclusionKeyword | undefined => {
  const filtered = getFilteredKeywords(allKeywords, selectedCategory);
  return filtered[index];
};
