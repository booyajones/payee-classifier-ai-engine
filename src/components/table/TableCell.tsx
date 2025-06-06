
import { PayeeClassification } from "@/lib/types";
import ClassificationBadge from "../ClassificationBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TableCellProps {
  result: PayeeClassification;
  column: {
    key: string;
    label: string;
    isOriginal: boolean;
  };
  onViewDetails: (result: PayeeClassification) => void;
}

const TableCell = ({ result, column, onViewDetails }: TableCellProps) => {
  console.log('[TABLE CELL] Rendering cell for column:', column.key, 'isOriginal:', column.isOriginal);
  
  if (column.isOriginal) {
    const value = result.originalData?.[column.key];
    console.log('[TABLE CELL] Original data value for', column.key, ':', value);
    return value || '';
  }
  
  switch (column.key) {
    case 'classification':
      return (
        <Badge variant={result.result.classification === 'Business' ? 'default' : 'secondary'}>
          {result.result.classification}
        </Badge>
      );
    case 'confidence':
      return <ClassificationBadge confidence={result.result.confidence} />;
    case 'processingTier':
      return result.result.processingTier || 'N/A';
    case 'reasoning':
      return (
        <div className="max-w-xs truncate" title={result.result.reasoning}>
          {result.result.reasoning}
        </div>
      );
    case 'keywordExclusion':
      const isExcluded = result.result.keywordExclusion?.isExcluded;
      console.log('[TABLE CELL] Keyword exclusion for result:', isExcluded, result.result.keywordExclusion);
      return (
        <Badge variant={isExcluded ? 'destructive' : 'secondary'}>
          {isExcluded ? 'Yes' : 'No'}
        </Badge>
      );
    case 'matchedKeywords':
      const keywords = result.result.keywordExclusion?.matchedKeywords || [];
      console.log('[TABLE CELL] Matched keywords:', keywords);
      return keywords.length > 0 ? keywords.join(', ') : '-';
    case 'keywordReasoning':
      const reasoning = result.result.keywordExclusion?.reasoning;
      console.log('[TABLE CELL] Keyword reasoning:', reasoning);
      return reasoning || '-';
    case 'details':
      return (
        <Button variant="ghost" size="sm" onClick={() => onViewDetails(result)}>
          View Details
        </Button>
      );
    default:
      return '';
  }
};

export default TableCell;
