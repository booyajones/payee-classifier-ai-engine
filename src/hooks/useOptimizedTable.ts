import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useOptimizedMemoryMonitor } from './useOptimizedMemoryMonitor';

interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  width?: number;
  sortable?: boolean;
  render?: (item: T, index: number) => React.ReactNode;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
}

interface VirtualizationConfig {
  enabled: boolean;
  itemHeight: number;
  overscan: number;
  containerHeight: number;
}

interface OptimizedTableOptions<T> {
  virtualization?: Partial<VirtualizationConfig>;
  pagination?: Partial<PaginationConfig>;
  defaultSort?: SortConfig;
  searchableFields?: (keyof T)[];
  filterFunction?: (item: T, query: string) => boolean;
}

export function useOptimizedTable<T extends Record<string, any>>(
  data: T[],
  columns: TableColumn<T>[],
  options: OptimizedTableOptions<T> = {}
) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(
    options.defaultSort || null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState<PaginationConfig>({
    page: 1,
    pageSize: options.pagination?.pageSize || 50,
    total: data.length
  });

  // Simple memoization without external dependencies
  const memoCache = useRef(new Map<string, any>());
  const previousDataRef = useRef<T[]>([]);
  const sortedDataRef = useRef<T[]>([]);

  // Virtualization config
  const virtualizationConfig = useMemo<VirtualizationConfig>(() => ({
    enabled: data.length > 100,
    itemHeight: 60,
    overscan: 10,
    containerHeight: 600,
    ...options.virtualization
  }), [data.length, options.virtualization]);

  // Optimized search function
  const searchFunction = useCallback((items: T[], query: string): T[] => {
    if (!query.trim()) return items;

    const searchLower = query.toLowerCase();
    
    if (options.filterFunction) {
      return items.filter(item => options.filterFunction!(item, query));
    }

    const searchFields = options.searchableFields || Object.keys(items[0] || {}) as (keyof T)[];
    
    return items.filter(item => 
      searchFields.some(field => {
        const value = item[field];
        if (value == null) return false;
        return String(value).toLowerCase().includes(searchLower);
      })
    );
  }, [options.filterFunction, options.searchableFields]);

  // Optimized sort function
  const sortFunction = useCallback((items: T[], config: SortConfig | null): T[] => {
    if (!config) return items;

    return [...items].sort((a, b) => {
      let aVal = a[config.key];
      let bVal = b[config.key];

      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Convert to comparable values
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      let result = 0;
      if (aVal < bVal) result = -1;
      else if (aVal > bVal) result = 1;

      return config.direction === 'desc' ? -result : result;
    });
  }, []);

  // Memoized processed data
  const processedData = useMemo(() => {
    // Use cache key based on data length, search query, and sort config
    const cacheKey = `table-${data.length}-${searchQuery}-${JSON.stringify(sortConfig)}`;
    
    // Simple memoization
    if (memoCache.current.has(cacheKey)) {
      return memoCache.current.get(cacheKey);
    }
    
    const result = (() => {
      // Only reprocess if data actually changed
      if (previousDataRef.current === data && sortedDataRef.current.length > 0) {
        const filtered = searchFunction(sortedDataRef.current, searchQuery);
        return filtered;
      }

      // Full reprocessing
      const sorted = sortFunction(data, sortConfig);
      sortedDataRef.current = sorted;
      previousDataRef.current = data;
      
      const filtered = searchFunction(sorted, searchQuery);
      return filtered;
    })();
    
    // Cache with size limit
    if (memoCache.current.size > 50) {
      memoCache.current.clear();
    }
    memoCache.current.set(cacheKey, result);
    return result;
  }, [data, searchQuery, sortConfig, sortFunction, searchFunction]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return processedData.slice(startIndex, endIndex);
  }, [processedData, pagination.page, pagination.pageSize]);

  // Virtualized data (only visible items)
  const virtualizedData = useMemo(() => {
    if (!virtualizationConfig.enabled) return paginatedData;

    // Calculate visible range based on scroll position
    const visibleCount = Math.ceil(virtualizationConfig.containerHeight / virtualizationConfig.itemHeight);
    const totalVisible = visibleCount + virtualizationConfig.overscan * 2;
    
    return paginatedData.slice(0, totalVisible);
  }, [paginatedData, virtualizationConfig]);

  // Table actions
  const handleSort = useCallback((key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        // Toggle direction or clear sort
        if (current.direction === 'asc') {
          return { key, direction: 'desc' };
        } else {
          return null; // Clear sort
        }
      } else {
        return { key, direction: 'asc' };
      }
    });
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setPagination(prev => ({ 
      ...prev, 
      pageSize, 
      page: 1 // Reset to first page
    }));
  }, []);

  // Update pagination total when data changes
  useEffect(() => {
    setPagination(prev => ({ 
      ...prev, 
      total: processedData.length,
      page: Math.min(prev.page, Math.max(1, Math.ceil(processedData.length / prev.pageSize)))
    }));
  }, [processedData.length]);

  // Simple bulk processing without external dependencies
  const bulkProcess = useCallback(async <R>(
    processor: (items: T[]) => Promise<R[]>,
    chunkSize = 100
  ): Promise<R[]> => {
    const results: R[] = [];
    for (let i = 0; i < processedData.length; i += chunkSize) {
      const chunk = processedData.slice(i, i + chunkSize);
      const chunkResults = await processor(chunk);
      results.push(...chunkResults);
      
      // Allow UI to breathe
      if (i + chunkSize < processedData.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    return results;
  }, [processedData]);

  // Export functionality
  const exportData = useCallback((format: 'csv' | 'json' = 'csv') => {
    const dataToExport = processedData;
    
    if (format === 'csv') {
      const headers = columns.map(col => col.label);
      const rows = dataToExport.map(item => 
        columns.map(col => {
          const value = item[col.key];
          return value != null ? String(value) : '';
        })
      );
      
      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `table-export-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const jsonContent = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `table-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  }, [processedData, columns]);

  return {
    // Data
    data: virtualizedData,
    allData: processedData,
    originalData: data,
    
    // State
    sortConfig,
    searchQuery,
    pagination: {
      ...pagination,
      totalPages: Math.ceil(pagination.total / pagination.pageSize)
    },
    virtualizationConfig,
    
    // Actions
    handleSort,
    handleSearch,
    handlePageChange,
    handlePageSizeChange,
    exportData,
    bulkProcess,
    
    // Stats
    stats: {
      total: data.length,
      filtered: processedData.length,
      visible: virtualizedData.length,
      isVirtualized: virtualizationConfig.enabled
    }
  };
}