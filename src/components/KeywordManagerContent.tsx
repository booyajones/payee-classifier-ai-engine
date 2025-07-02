
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ExclusionKeyword } from "@/lib/database/exclusionKeywordService";
import KeywordActions from "./KeywordActions";
import KeywordStats from "./KeywordStats";
import KeywordTester from "./KeywordTester";
import KeywordTable from "./KeywordTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface KeywordManagerContentProps {
  allKeywords: ExclusionKeyword[];
  categories: string[];
  selectedCategory: string;
  editingIndex: number | null;
  editingValue: string;
  editingCategory: string;
  saving: boolean;
  totalKeywords: number;
  filteredCount: number;
  onAddKeyword: (keyword: string, category?: string) => Promise<void>;
  onResetToDefaults: () => Promise<void>;
  onResetCategory: (category: string) => Promise<void>;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditingValueChange: (value: string) => void;
  onEditingCategoryChange: (value: string) => void;
  onCategoryChange: (category: string) => void;
}

const KeywordManagerContent = ({
  allKeywords,
  categories,
  selectedCategory,
  editingIndex,
  editingValue,
  editingCategory,
  saving,
  totalKeywords,
  filteredCount,
  onAddKeyword,
  onResetToDefaults,
  onResetCategory,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  onEditingValueChange,
  onEditingCategoryChange,
  onCategoryChange,
}: KeywordManagerContentProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <label htmlFor="category-filter" className="block text-sm font-medium mb-2">
                Filter by Category
              </label>
              <Select value={selectedCategory === 'all' ? selectedCategory : undefined} onValueChange={onCategoryChange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {filteredCount} of {totalKeywords} keywords
            </div>
          </div>

          <KeywordActions
            saving={saving}
            categories={categories.filter(c => c !== 'all')}
            selectedCategory={selectedCategory}
            onAddKeyword={onAddKeyword}
            onResetToDefaults={onResetToDefaults}
            onResetCategory={onResetCategory}
          />

          <KeywordStats
            allKeywords={allKeywords}
            totalKeywords={totalKeywords}
            filteredCount={filteredCount}
          />
        </CardContent>
      </Card>

      <KeywordTester allKeywords={allKeywords.map(k => k.keyword)} />

      <Card>
        <CardHeader>
          <CardTitle>Current Exclusion Keywords</CardTitle>
          <CardDescription>
            All keywords can now be edited or deleted. Built-in keywords are marked with their category.
            Use the category filter above to find specific keywords quickly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <KeywordTable
            allKeywords={allKeywords}
            editingIndex={editingIndex}
            editingValue={editingValue}
            editingCategory={editingCategory}
            saving={saving}
            onEdit={onEdit}
            onDelete={onDelete}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onEditingValueChange={onEditingValueChange}
            onEditingCategoryChange={onEditingCategoryChange}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default KeywordManagerContent;
