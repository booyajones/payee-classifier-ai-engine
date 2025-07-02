
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, RotateCcw } from "lucide-react";

interface KeywordActionsProps {
  saving: boolean;
  categories: string[];
  selectedCategory: string;
  onAddKeyword: (keyword: string, category?: string) => Promise<void>;
  onResetToDefaults: () => Promise<void>;
  onResetCategory: (category: string) => Promise<void>;
}

const KeywordActions = ({ 
  saving, 
  categories, 
  selectedCategory, 
  onAddKeyword, 
  onResetToDefaults,
  onResetCategory 
}: KeywordActionsProps) => {
  const [newKeyword, setNewKeyword] = useState("");
  const [newCategory, setNewCategory] = useState("custom");

  const handleAddKeyword = async () => {
    if (newKeyword.trim()) {
      await onAddKeyword(newKeyword.trim(), newCategory);
      setNewKeyword("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddKeyword();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="new-keyword">Add New Keyword</Label>
          <Input
            id="new-keyword"
            placeholder="Enter keyword to exclude"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={saving}
          />
        </div>
        <div className="min-w-[150px]">
          <Label htmlFor="category-select">Category</Label>
          <Select value={newCategory} onValueChange={setNewCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Custom</SelectItem>
              {categories.filter(cat => cat !== 'custom').map((category) => (
                <SelectItem key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={handleAddKeyword} disabled={saving || !newKeyword.trim()}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Add
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" onClick={onResetToDefaults} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
          Clear All Custom Keywords
        </Button>
        {selectedCategory !== 'all' && (
          <Button 
            variant="outline" 
            onClick={() => onResetCategory(selectedCategory)} 
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
            Reset "{selectedCategory}" Category
          </Button>
        )}
      </div>
    </div>
  );
};

export default KeywordActions;
