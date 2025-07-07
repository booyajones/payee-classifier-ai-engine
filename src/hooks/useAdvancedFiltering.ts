import { useState, useMemo, useCallback } from 'react';
import { PayeeClassification } from '@/lib/types';
import { FilterCriteria } from '@/components/search/AdvancedSearchFilters';

export const useAdvancedFiltering = (data: PayeeClassification[]) => {
  const [filters, setFilters] = useState<FilterCriteria>({
    searchTerm: '',
    classification: 'all',
    sicCode: '',
    confidenceRange: [0, 100],
    dateRange: {
      start: null,
      end: null
    },
    isDuplicate: null,
    hasErrors: null
  });

  // Memoized filtered results
  const filteredResults = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.filter(item => {
      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesPayeeName = item.payeeName?.toLowerCase().includes(searchLower);
        const matchesSicDescription = item.result?.sicDescription?.toLowerCase().includes(searchLower);
        const matchesReasoning = item.result?.reasoning?.toLowerCase().includes(searchLower);
        
        if (!matchesPayeeName && !matchesSicDescription && !matchesReasoning) {
          return false;
        }
      }

      // Classification filter
      if (filters.classification && filters.classification !== 'all') {
        if (item.result?.classification?.toLowerCase() !== filters.classification.toLowerCase()) {
          return false;
        }
      }

      // SIC Code filter
      if (filters.sicCode) {
        if (!item.result?.sicCode?.includes(filters.sicCode)) {
          return false;
        }
      }

      // Confidence range filter
      if (item.result?.confidence !== undefined) {
        const confidence = item.result.confidence * 100; // Convert to percentage
        if (confidence < filters.confidenceRange[0] || confidence > filters.confidenceRange[1]) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateRange.start || filters.dateRange.end) {
        const itemDate = new Date(item.timestamp || Date.now());
        
        if (filters.dateRange.start && itemDate < filters.dateRange.start) {
          return false;
        }
        
        if (filters.dateRange.end && itemDate > filters.dateRange.end) {
          return false;
        }
      }

      // Duplicate filter (simplified for now)
      if (filters.isDuplicate !== null) {
        // Note: PayeeClassification doesn't have isPotentialDuplicate, so we'll skip this filter
        // This would need to be implemented based on your duplicate detection logic
        return true;
      }

      // Error filter
      if (filters.hasErrors !== null) {
        const hasErrors = !item.result?.classification || item.result.confidence < 0.5;
        if (hasErrors !== filters.hasErrors) {
          return false;
        }
      }

      return true;
    });
  }, [data, filters]);

  // Statistics
  const statistics = useMemo(() => {
    const total = data.length;
    const filtered = filteredResults.length;
    
    const businessCount = filteredResults.filter(item => 
      item.result?.classification?.toLowerCase() === 'business'
    ).length;
    
    const individualCount = filteredResults.filter(item => 
      item.result?.classification?.toLowerCase() === 'individual'
    ).length;
    
    const unknownCount = filteredResults.filter(item => 
      !item.result?.classification || item.result.classification.toLowerCase() === 'unknown'
    ).length;
    
    const duplicateCount = 0; // Simplified for now
    
    const avgConfidence = filteredResults.length > 0
      ? filteredResults.reduce((sum, item) => sum + (item.result?.confidence || 0), 0) / filteredResults.length
      : 0;

    return {
      total,
      filtered,
      businessCount,
      individualCount,
      unknownCount,
      duplicateCount,
      avgConfidence: Math.round(avgConfidence * 100)
    };
  }, [data, filteredResults]);

  const updateFilters = useCallback((newFilters: FilterCriteria) => {
    setFilters(newFilters);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      searchTerm: '',
      classification: 'all',
      sicCode: '',
      confidenceRange: [0, 100],
      dateRange: {
        start: null,
        end: null
      },
      isDuplicate: null,
      hasErrors: null
    });
  }, []);

  // Export functionality
  const exportFilteredResults = useCallback((format: 'csv' | 'json' = 'csv') => {
    if (filteredResults.length === 0) {
      throw new Error('No data to export');
    }

    if (format === 'csv') {
      const headers = [
        'Payee Name',
        'Classification',
        'Confidence',
        'SIC Code',
        'SIC Description',
        'Is Duplicate',
        'Created At',
        'Reasoning'
      ];

      const csvData = filteredResults.map(item => [
        item.payeeName || '',
        item.result?.classification || '',
        item.result?.confidence ? (item.result.confidence * 100).toFixed(1) + '%' : '',
        item.result?.sicCode || '',
        item.result?.sicDescription || '',
        'No', // Simplified for now
        item.timestamp ? new Date(item.timestamp).toLocaleDateString() : '',
        item.result?.reasoning || ''
      ]);

      const csvContent = [headers, ...csvData]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `filtered-results-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } else {
      // JSON export
      const jsonContent = JSON.stringify(filteredResults, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `filtered-results-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
    }
  }, [filteredResults]);

  return {
    filters,
    filteredResults,
    statistics,
    updateFilters,
    clearFilters,
    exportFilteredResults
  };
};