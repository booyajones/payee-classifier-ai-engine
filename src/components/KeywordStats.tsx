
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { type ExclusionKeyword } from "@/lib/database/exclusionKeywordService";

interface KeywordStatsProps {
  comprehensiveKeywords: string[];
  customKeywords: ExclusionKeyword[];
  allKeywords: string[];
}

const KeywordStats = ({ comprehensiveKeywords, customKeywords, allKeywords }: KeywordStatsProps) => {
  const activeCustomKeywords = customKeywords.filter(k => k.is_active);

  return (
    <div className="flex gap-2 flex-wrap items-center">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-green-600" />
        <span className="text-sm font-medium">Keyword Statistics:</span>
      </div>
      <Badge variant="secondary">
        {comprehensiveKeywords.length} built-in keywords
      </Badge>
      <Badge variant="outline">
        {activeCustomKeywords.length} custom keywords
      </Badge>
      <Badge variant="default">
        {allKeywords.length} total keywords
      </Badge>
    </div>
  );
};

export default KeywordStats;
