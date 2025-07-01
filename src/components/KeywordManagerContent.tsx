
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ExclusionKeyword } from "@/lib/database/exclusionKeywordService";
import KeywordActions from "./KeywordActions";
import KeywordStats from "./KeywordStats";
import KeywordTester from "./KeywordTester";
import KeywordTable from "./KeywordTable";

interface KeywordManagerContentProps {
  comprehensiveKeywords: string[];
  customKeywords: ExclusionKeyword[];
  allKeywords: string[];
  editingIndex: number | null;
  editingValue: string;
  saving: boolean;
  onAddKeyword: (keyword: string) => Promise<void>;
  onResetToDefaults: () => Promise<void>;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditingValueChange: (value: string) => void;
}

const KeywordManagerContent = ({
  comprehensiveKeywords,
  customKeywords,
  allKeywords,
  editingIndex,
  editingValue,
  saving,
  onAddKeyword,
  onResetToDefaults,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  onEditingValueChange,
}: KeywordManagerContentProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-6 pt-6">
          <KeywordActions
            saving={saving}
            onAddKeyword={onAddKeyword}
            onResetToDefaults={onResetToDefaults}
          />

          <KeywordStats
            comprehensiveKeywords={comprehensiveKeywords}
            customKeywords={customKeywords}
            allKeywords={allKeywords}
          />
        </CardContent>
      </Card>

      <KeywordTester allKeywords={allKeywords} />

      <Card>
        <CardHeader>
          <CardTitle>Current Exclusion Keywords</CardTitle>
          <CardDescription>
            Built-in keywords cannot be edited or deleted. Custom keywords can be modified or removed.
            Use the search and filter options to find specific keywords quickly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <KeywordTable
            allKeywords={allKeywords}
            comprehensiveKeywords={comprehensiveKeywords}
            customKeywords={customKeywords}
            editingIndex={editingIndex}
            editingValue={editingValue}
            saving={saving}
            onEdit={onEdit}
            onDelete={onDelete}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onEditingValueChange={onEditingValueChange}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default KeywordManagerContent;
