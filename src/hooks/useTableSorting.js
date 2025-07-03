import { useState, useMemo } from 'react';

export const useTableSorting = (data, initialSortConfig = null) => {
  const [sortConfig, setSortConfig] = useState(initialSortConfig);

  const sortedData = useMemo(() => {
    if (!sortConfig || !data) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  const requestSort = (key) => {
    setSortConfig(prev => {
      let direction = 'ascending';
      if (prev && prev.key === key && prev.direction === 'ascending') {
        direction = 'descending';
      }
      return { key, direction };
    });
  };

  return {
    sortedData,
    sortConfig,
    requestSort
  };
};