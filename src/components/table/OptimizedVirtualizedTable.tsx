
import React, { useMemo, useCallback, memo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Table, TableBody } from '@/components/ui/table';
import { PayeeClassification } from '@/lib/types';
import ClassificationTableHeader from './TableHeader';
import VirtualizedTableRow from './VirtualizedTableRow';
import { MemoryOptimizer } from '@/lib/performance/memoryOptimization';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';

interface OptimizedVirtualizedTableProps {
  results: PayeeClassification[];
  columns: Array<{ key: string; label: string; isOriginal: boolean }>;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  onViewDetails: (result: PayeeClassification) => void;
  enablePerformanceMonitoring?: boolean;
}

const ITEM_HEIGHT = 48;
const MAX_HEIGHT = 600;
const OVERSCAN_COUNT = 5; // Number of items to render outside visible area
const PERFORMANCE_THRESHOLD = 1000; // Use virtualization for 1000+ items

// Enhanced columns including SIC fields - CORRECTED VERSION
const getEnhancedColumns = (originalColumns: Array<{ key: string; label: string; isOriginal: boolean }>) => {
  console.log('[OPTIMIZED TABLE] Original columns:', originalColumns);
  
  const classificationColumns = [
    { key: 'classification', label: 'Classification', isOriginal: false },
    { key: 'confidence', label: 'Confidence', isOriginal: false },
    { key: 'sicCode', label: 'SIC Code', isOriginal: false },
    { key: 'sicDescription', label: 'SIC Description', isOriginal: false },
    { key: 'processingTier', label: 'Processing Tier', isOriginal: false },
    { key: 'reasoning', label: 'Reasoning', isOriginal: false },
    { key: 'keywordExclusion', label: 'Excluded', isOriginal: false },
    { key: 'matchedKeywords', label: 'Keywords', isOriginal: false },
    { key: 'details', label: 'Details', isOriginal: false }
  ];
  
  const enhancedColumns = [...originalColumns, ...classificationColumns];
  console.log('[OPTIMIZED TABLE] Enhanced columns with SIC:', enhancedColumns);
  
  return enhancedColumns;
};

const OptimizedVirtualizedTable = memo<OptimizedVirtualizedTableProps>(({
  results,
  columns,
  sortField,
  sortDirection,
  onSort,
  onViewDetails,
  enablePerformanceMonitoring = false
}) => {
  const { startOperation, finishOperation } = usePerformanceMonitoring(enablePerformanceMonitoring);

  // Enhanced column configuration with SIC fields
  const enhancedColumns = useMemo(() => getEnhancedColumns(columns), [columns]);

  // Debug SIC data presence
  React.useEffect(() => {
    const businessResults = results.filter(r => r.result.classification === 'Business');
    const sicResults = results.filter(r => r.result.sicCode);
    console.log(`[OPTIMIZED TABLE DEBUG] Business entities: ${businessResults.length}, With SIC codes: ${sicResults.length}`);
    
    // Sample SIC data logging
    if (sicResults.length > 0) {
      console.log('[OPTIMIZED TABLE DEBUG] Sample SIC codes:', sicResults.slice(0, 3).map(r => ({
        payee: r.payeeName,
        classification: r.result.classification,
        sicCode: r.result.sicCode,
        sicDescription: r.result.sicDescription?.substring(0, 50) + '...'
      })));
    } else {
      console.warn('[OPTIMIZED TABLE DEBUG] No SIC codes found in results');
    }
  }, [results]);

  // Memoize table height calculation
  const tableHeight = useMemo(() => {
    const height = Math.min(results.length * ITEM_HEIGHT, MAX_HEIGHT);
    console.log(`[OPTIMIZED TABLE] Calculated height: ${height}px for ${results.length} items`);
    return height;
  }, [results.length]);

  // Optimize row rendering with proper memoization
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const result = results[index];
    if (!result) return null;

    return (
      <VirtualizedTableRow
        result={result}
        columns={enhancedColumns}
        index={index}
        style={style}
        onViewDetails={onViewDetails}
      />
    );
  }, [results, enhancedColumns, onViewDetails]);

  // Memoize the decision whether to use virtualization
  const shouldVirtualize = useMemo(() => {
    const memoryStats = MemoryOptimizer.getMemoryStats();
    const forceVirtualization = memoryStats.memoryPressure === 'high' || results.length > PERFORMANCE_THRESHOLD;
    
    console.log(`[OPTIMIZED TABLE] Virtualization decision:`, {
      itemCount: results.length,
      memoryPressure: memoryStats.memoryPressure,
      shouldVirtualize: forceVirtualization
    });
    
    return forceVirtualization;
  }, [results.length]);

  // Track performance for large operations
  React.useEffect(() => {
    if (!enablePerformanceMonitoring || results.length < 100) return;

    const operationId = startOperation(`table-render-${results.length}-items`);
    
    return () => {
      finishOperation(operationId);
    };
  }, [results.length, startOperation, finishOperation, enablePerformanceMonitoring]);

  // Memory cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (results.length > 1000) {
        console.log('[OPTIMIZED TABLE] Performing cleanup for large dataset');
        MemoryOptimizer.suggestGarbageCollection();
      }
    };
  }, [results.length]);

  // For small datasets or low memory pressure, render normally
  if (!shouldVirtualize) {
    return (
      <div className="optimized-table-container">
        <Table>
          <ClassificationTableHeader 
            columns={enhancedColumns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={onSort}
          />
          <TableBody>
            {results.map((result, index) => (
              <VirtualizedTableRow
                key={`${result.id}-${index}`}
                result={result}
                columns={enhancedColumns}
                index={index}
                style={{}}
                onViewDetails={onViewDetails}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // For large datasets, use virtualization with optimizations
  return (
    <div className="optimized-table-container">
      <Table>
        <ClassificationTableHeader 
          columns={enhancedColumns}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={onSort}
        />
      </Table>
      <div 
        style={{ 
          height: tableHeight, 
          overflow: 'auto',
          // Performance optimizations
          willChange: 'transform',
          contain: 'layout style paint'
        }}
      >
        <List
          height={tableHeight}
          itemCount={results.length}
          itemSize={ITEM_HEIGHT}
          width="100%"
          overscanCount={OVERSCAN_COUNT}
          // Performance optimizations
          useIsScrolling={true}
          initialScrollOffset={0}
        >
          {Row}
        </List>
      </div>
      
      {enablePerformanceMonitoring && results.length > 5000 && (
        <div className="text-xs text-muted-foreground mt-2 p-2 bg-blue-50 rounded">
          <span className="font-medium">Performance Mode:</span> Virtualized rendering active for {results.length.toLocaleString()} items
        </div>
      )}
    </div>
  );
});

OptimizedVirtualizedTable.displayName = 'OptimizedVirtualizedTable';

export default OptimizedVirtualizedTable;
