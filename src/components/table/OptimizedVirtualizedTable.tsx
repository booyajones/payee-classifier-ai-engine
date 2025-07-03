import React, { useMemo } from 'react';
import { Table, TableBody } from '@/components/ui/table';
import { PayeeClassification } from '@/lib/types';
import ClassificationTableHeader from './TableHeader';
import VirtualizedTableRow from './VirtualizedTableRow';

interface OptimizedVirtualizedTableProps {
  results: PayeeClassification[];
  columns: Array<{ key: string; label: string; isOriginal: boolean }>;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  onViewDetails: (result: PayeeClassification) => void;
}

// Simple enhanced columns without performance monitoring
const getEnhancedColumns = (originalColumns: Array<{ key: string; label: string; isOriginal: boolean }>) => {
  const classificationColumns = [
    { key: 'classification', label: 'Classification', isOriginal: false },
    { key: 'confidence', label: 'Confidence', isOriginal: false },
    { key: 'processingTier', label: 'Processing Tier', isOriginal: false },
    { key: 'details', label: 'Details', isOriginal: false }
  ];
  
  return [...originalColumns, ...classificationColumns];
};

const OptimizedVirtualizedTable = ({
  results,
  columns,
  sortField,
  sortDirection,
  onSort,
  onViewDetails
}: OptimizedVirtualizedTableProps) => {
  // Simple memoized columns
  const enhancedColumns = useMemo(() => getEnhancedColumns(columns), [columns]);

  // Early return for empty results
  if (results.length === 0) {
    return (
      <div className="w-full space-y-4">
        <div className="text-center py-8 border rounded-md">
          <p className="text-muted-foreground">No results to display</p>
        </div>
      </div>
    );
  }

  // Simple table render without virtualization complexity
  return (
    <div className="w-full space-y-4">
      <div className="rounded-md border">
        <Table>
          <ClassificationTableHeader
            columns={enhancedColumns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={onSort}
          />
          <TableBody>
            {results.slice(0, 100).map((result, index) => (
              <VirtualizedTableRow
                key={`${result.payeeName}-${index}`}
                result={result}
                columns={enhancedColumns}
                index={index}
                style={{}}
                onViewDetails={onViewDetails}
              />
            ))}
          </TableBody>
        </Table>
        {results.length > 100 && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Showing first 100 of {results.length} results
          </div>
        )}
      </div>
    </div>
  );
};

export default OptimizedVirtualizedTable;