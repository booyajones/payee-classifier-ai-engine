// @ts-nocheck
import { useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';

interface OptimizedVirtualizedTableProps<T> {
  items: T[];
  itemHeight: number;
  renderRow: (index: number, style: React.CSSProperties) => React.ReactNode;
  overscanCount?: number;
  width?: number;
  height?: number;
}

function OptimizedVirtualizedTable<T>({
  items,
  itemHeight,
  renderRow,
  overscanCount = 5,
  width = 800,
  height = 600,
}: OptimizedVirtualizedTableProps<T>) {
  const rowRenderer = useCallback(
    ({ index, style }) => {
      return renderRow(index, style);
    },
    [renderRow]
  );

  const itemCount = useMemo(() => items.length, [items]);

  return (
    <List
      height={height}
      width={width}
      itemSize={itemHeight}
      itemCount={itemCount}
      overscanCount={overscanCount}
    >
      {rowRenderer}
    </List>
  );
}

export default OptimizedVirtualizedTable;
