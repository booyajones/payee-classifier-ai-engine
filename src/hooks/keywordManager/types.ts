import { type ExclusionKeyword } from "@/lib/database/exclusionKeywordService";

export interface KeywordManagerState {
  allKeywords: ExclusionKeyword[];
  categories: string[];
  editingIndex: number | null;
  editingValue: string;
  editingCategory: string;
  selectedCategory: string;
  loading: boolean;
  saving: boolean;
}

export interface KeywordManagerActions {
  handleAddKeyword: (keyword: string, category?: string) => Promise<void>;
  handleEditKeyword: (index: number) => void;
  handleSaveEdit: () => void;
  handleCancelEdit: () => void;
  handleDeleteKeyword: (index: number) => void;
  resetToDefaults: () => Promise<void>;
  resetCategory: (category: string) => Promise<void>;
  setEditingValue: (value: string) => void;
  setEditingCategory: (value: string) => void;
  setSelectedCategory: (category: string) => void;
}

export interface KeywordManagerReturn extends KeywordManagerState, KeywordManagerActions {
  totalKeywords: number;
  filteredCount: number;
  rawAllKeywords: ExclusionKeyword[];
}
