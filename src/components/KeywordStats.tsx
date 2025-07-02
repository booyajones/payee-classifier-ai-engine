
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { type ExclusionKeyword } from "@/lib/database/exclusionKeywordService";

interface KeywordStatsProps {
  allKeywords: ExclusionKeyword[];
  totalKeywords: number;
  filteredCount: number;
}

const KeywordStats = ({ allKeywords, totalKeywords, filteredCount }: KeywordStatsProps) => {
  const builtinKeywords = allKeywords.filter(k => k.keyword_type === 'builtin');
  const customKeywords = allKeywords.filter(k => k.keyword_type === 'custom');
  const categories = [...new Set(allKeywords.map(k => k.category))];

  return (
    <div className="flex gap-2 flex-wrap items-center">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-green-600" />
        <span className="text-sm font-medium">Keyword Statistics:</span>
      </div>
      <Badge variant="secondary">
        {builtinKeywords.length} built-in keywords
      </Badge>
      <Badge variant="outline">
        {customKeywords.length} custom keywords
      </Badge>
      <Badge variant="default">
        {totalKeywords} total keywords
      </Badge>
      <Badge variant="secondary">
        {categories.length} categories
      </Badge>
      {filteredCount !== totalKeywords && (
        <Badge variant="outline">
          {filteredCount} filtered
        </Badge>
      )}
    </div>
  );
};

export default KeywordStats;
