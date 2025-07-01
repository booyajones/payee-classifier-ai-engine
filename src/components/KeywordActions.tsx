
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";

interface KeywordActionsProps {
  saving: boolean;
  onAddKeyword: (keyword: string) => Promise<void>;
  onResetToDefaults: () => Promise<void>;
}

const KeywordActions = ({ saving, onAddKeyword, onResetToDefaults }: KeywordActionsProps) => {
  const [newKeyword, setNewKeyword] = useState("");

  const handleAddKeyword = async () => {
    if (newKeyword.trim()) {
      await onAddKeyword(newKeyword.trim());
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
          <Label htmlFor="new-keyword">Add New Custom Keyword</Label>
          <Input
            id="new-keyword"
            placeholder="Enter keyword to exclude"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={saving}
          />
        </div>
        <div className="flex items-end">
          <Button onClick={handleAddKeyword} disabled={saving || !newKeyword.trim()}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Add
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onResetToDefaults} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Clear All Custom Keywords
        </Button>
      </div>
    </div>
  );
};

export default KeywordActions;
