
import React, { useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Table, TableBody } from '@/components/ui/table';
import { PayeeClassification } from '@/lib/types';
import ClassificationTableHeader from './TableHeader';
import VirtualizedTableRow from './VirtualizedTableRow';

interface VirtualizedTableProps {
  results: PayeeClassification[];
  columns: Array<{ key: string; label: string; isOriginal: boolean }>;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  onViewDetails: (result: PayeeClassification) => void;
}

const ITEM_HEIGHT = 48; // Height of each row in pixels
const MAX_HEIGHT = 600; // Maximum table height

const VirtualizedTable = React.memo(({
  results,
  columns,
  sortField,
  sortDirection,
  onSort,
  onViewDetails
}: VirtualizedTableProps) => {
  const tableHeight = useMemo(() => {
    return Math.min(results.length * ITEM_HEIGHT, MAX_HEIGHT);
  }, [results.length]);

  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => (
    <VirtualizedTableRow
      result={results[index]}
      columns={columns}
      index={index}
      style={style}
      onViewDetails={onViewDetails}
    />
  ), [results, columns, onViewDetails]);

  // For small datasets, render normally
  if (results.length < 100) {
    return (
      <Table>
        <ClassificationTableHeader 
          columns={columns}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={onSort}
        />
        <TableBody>
          {results.map((result, index) => (
            <VirtualizedTableRow
              key={`${result.id}-${index}`}
              result={result}
              columns={columns}
              index={index}
              style={{}}
              onViewDetails={onViewDetails}
            />
          ))}
        </TableBody>
      </Table>
    );
  }

  // For large datasets, use virtualization
  return (
    <div>
      <Table>
        <ClassificationTableHeader 
          columns={columns}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={onSort}
        />
      </Table>
      <div style={{ height: tableHeight, overflow: 'auto' }}>
        <List
          height={tableHeight}
          itemCount={results.length}
          itemSize={ITEM_HEIGHT}
          width="100%"
        >
          {Row}
        </List>
      </div>
    </div>
  );
});

VirtualizedTable.displayName = 'VirtualizedTable';

export default VirtualizedTable;
