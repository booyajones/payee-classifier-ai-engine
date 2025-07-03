// @ts-nocheck
import { memo } from 'react';
import { TableCell } from './TableCell';

interface VirtualizedTableRowProps {
  rowIndex: number;
  data: any[];
  style: React.CSSProperties;
  columns: any[];
}

export const VirtualizedTableRow = memo(
  ({ rowIndex, data, style, columns }: VirtualizedTableRowProps) => {
    const row = data[rowIndex];

    return (
      <div className="table-row" style={style}>
        {columns.map((column, index) => (
          <TableCell key={`${rowIndex}-${column.key}`} value={row[column.key]} column={column} />
        ))}
      </div>
    );
  }
);

VirtualizedTableRow.displayName = 'VirtualizedTableRow';
