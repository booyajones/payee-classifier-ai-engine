
import { useState } from 'react';
import { PayeeClassification } from '@/lib/types';

type SortDirection = 'asc' | 'desc';

export const useTableSorting = (results: PayeeClassification[], originalColumns: string[]) => {
  const [sortField, setSortField] = useState<string>('payeeName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    let comparison = 0;
    
    // Handle original data columns
    if (originalColumns.includes(sortField)) {
      const aValue = a.originalData?.[sortField] || '';
      const bValue = b.originalData?.[sortField] || '';
      comparison = String(aValue).localeCompare(String(bValue));
    } else {
      // Handle classification columns
      switch (sortField) {
        case 'classification':
          comparison = a.result.classification.localeCompare(b.result.classification);
          break;
        case 'confidence':
          comparison = a.result.confidence - b.result.confidence;
          break;
        case 'processingTier':
          comparison = (a.result.processingTier || '').localeCompare(b.result.processingTier || '');
          break;
        case 'keywordExclusion':
          const aExcluded = a.result.keywordExclusion?.isExcluded ? 'Yes' : 'No';
          const bExcluded = b.result.keywordExclusion?.isExcluded ? 'Yes' : 'No';
          comparison = aExcluded.localeCompare(bExcluded);
          break;
        default:
          comparison = a.payeeName.localeCompare(b.payeeName);
      }
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return {
    sortField,
    sortDirection,
    sortedResults,
    handleSort
  };
};
