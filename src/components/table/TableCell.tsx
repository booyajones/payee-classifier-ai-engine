
import React, { useMemo, useCallback } from "react";
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

const TableCell = React.memo(({ result, column, onViewDetails }: TableCellProps) => {
  console.log('[TABLE CELL] Rendering cell for column:', column.key, 'isOriginal:', column.isOriginal);
  
  const handleViewDetails = useCallback(() => {
    onViewDetails(result);
  }, [result, onViewDetails]);

  const cellContent = useMemo(() => {
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
      case 'sicCode':
        const sicCode = result.result.sicCode;
        console.log('[TABLE CELL] SIC Code for result:', sicCode, 'Classification:', result.result.classification);
        return sicCode ? (
          <Badge variant="outline" className="font-mono text-blue-700 bg-blue-50">
            {sicCode}
          </Badge>
        ) : (
          <span className="text-gray-400 text-sm">
            {result.result.classification === 'Business' ? 'Missing' : '-'}
          </span>
        );
      case 'sicDescription':
        const sicDescription = result.result.sicDescription;
        console.log('[TABLE CELL] SIC Description for result:', sicDescription?.substring(0, 50));
        return sicDescription ? (
          <div className="max-w-xs truncate" title={sicDescription}>
            <span className="text-sm text-gray-700">{sicDescription}</span>
          </div>
        ) : (
          <span className="text-gray-400 text-sm">
            {result.result.classification === 'Business' ? 'Missing' : '-'}
          </span>
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
        return keywords.length > 0 ? (
          <div className="max-w-xs truncate" title={keywords.join(', ')}>
            <span className="text-sm text-orange-700">{keywords.join(', ')}</span>
          </div>
        ) : '-';
      case 'keywordReasoning':
        const reasoning = result.result.keywordExclusion?.reasoning;
        console.log('[TABLE CELL] Keyword reasoning:', reasoning);
        return reasoning || '-';
      case 'details':
        return (
          <Button variant="ghost" size="sm" onClick={handleViewDetails}>
            View Details
          </Button>
        );
      default:
        console.warn('[TABLE CELL] Unknown column key:', column.key);
        return '';
    }
  }, [result, column, handleViewDetails]);

  return <>{cellContent}</>;
});

TableCell.displayName = 'TableCell';

export default TableCell;
