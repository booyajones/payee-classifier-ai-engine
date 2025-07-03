// @ts-nocheck
import { memo } from 'react';
import { TableCell } from './TableCell';

interface VirtualizedTableRowProps {
  result?: any;
  index?: number;
  style: React.CSSProperties;
  columns: any[];
  onViewDetails?: (result: any) => void;
  rowIndex?: number;
  data?: any[];
}

export const VirtualizedTableRow = memo(
  ({ result, index, rowIndex, data, style, columns, onViewDetails }: VirtualizedTableRowProps) => {
    const row = result || (data && data[rowIndex || index || 0]);

    return (
      <div className="table-row" style={style}>
        {columns.map((column) => (
          <TableCell key={`${index || rowIndex}-${column.key}`} value={row[column.key]} column={column} />
        ))}
      </div>
    );
  }
);

VirtualizedTableRow.displayName = 'VirtualizedTableRow';