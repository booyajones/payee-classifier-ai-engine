
import React, { useState, useMemo, useCallback } from "react";
import { PayeeClassification } from "@/lib/types";
import { useTableSorting } from "@/hooks/useTableSorting";
import VirtualizedTable from "./table/VirtualizedTable";
import ExportButtons from "./table/ExportButtons";
import DetailsModal from "./table/DetailsModal";

interface ClassificationResultTableProps {
  results: PayeeClassification[];
}

const ClassificationResultTable = React.memo(({ results }: ClassificationResultTableProps) => {
  const [selectedResult, setSelectedResult] = useState<PayeeClassification | null>(null);
  
  const validResults = useMemo(() => 
    results.filter(result => result && result.result), 
    [results]
  );
  
  const { allColumns, originalColumns } = useMemo(() => {
    if (validResults.length === 0) {
      return { allColumns: [], originalColumns: [] };
    }

    const allOriginalColumns = new Set<string>();
    validResults.forEach(result => {
      if (result.originalData) {
        Object.keys(result.originalData).forEach(key => allOriginalColumns.add(key));
      }
    });
    const originalColumns = Array.from(allOriginalColumns);
    
    const classificationColumns = [
      { key: 'classification', label: 'Classification' },
      { key: 'confidence', label: 'Confidence' },
      { key: 'processingTier', label: 'Processing Tier' },
      { key: 'reasoning', label: 'Reasoning' }
    ];
    
    const keywordColumns = [
      { key: 'keywordExclusion', label: 'Excluded by Keywords' },
      { key: 'matchedKeywords', label: 'Matched Keywords' },
      { key: 'keywordReasoning', label: 'Keyword Reasoning' }
    ];
    
    const allColumns = [
      ...originalColumns.map(col => ({ key: col, label: col, isOriginal: true })),
      ...classificationColumns.map(col => ({ ...col, isOriginal: false })),
      ...keywordColumns.map(col => ({ ...col, isOriginal: false })),
      { key: 'details', label: 'Details', isOriginal: false }
    ];

    return { allColumns, originalColumns };
  }, [validResults]);
  
  const { sortField, sortDirection, sortedResults, handleSort } = useTableSorting(validResults, originalColumns);
  
  const handleViewDetails = useCallback((result: PayeeClassification) => {
    setSelectedResult(result);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedResult(null);
  }, []);

  if (validResults.length === 0) {
    return (
      <div className="text-center py-8 border rounded-md">
        <p className="text-muted-foreground">No valid results to display.</p>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-muted-foreground">
          Showing {validResults.length} results
        </div>
        <ExportButtons results={results} />
      </div>

      <div className="border rounded-md overflow-hidden">
        <VirtualizedTable
          results={sortedResults}
          columns={allColumns}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          onViewDetails={handleViewDetails}
        />
      </div>

      <DetailsModal 
        selectedResult={selectedResult} 
        onClose={handleCloseDetails} 
      />
    </div>
  );
});

ClassificationResultTable.displayName = 'ClassificationResultTable';

export default ClassificationResultTable;
