
import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { PayeeClassification } from '@/lib/types';
import TableCellComponent from './TableCell';

interface VirtualizedTableRowProps {
  result: PayeeClassification;
  columns: Array<{ key: string; label: string; isOriginal: boolean }>;
  index: number;
  style: React.CSSProperties;
  onViewDetails: (result: PayeeClassification) => void;
}

const VirtualizedTableRow = React.memo(({ 
  result, 
  columns, 
  index, 
  style, 
  onViewDetails 
}: VirtualizedTableRowProps) => {
  return (
    <div style={style}>
      <TableRow>
        {columns.map((column) => (
          <TableCell key={column.key} className="whitespace-nowrap">
            <TableCellComponent 
              result={result} 
              column={column} 
              onViewDetails={onViewDetails}
            />
          </TableCell>
        ))}
      </TableRow>
    </div>
  );
});

VirtualizedTableRow.displayName = 'VirtualizedTableRow';

export default VirtualizedTableRow;
