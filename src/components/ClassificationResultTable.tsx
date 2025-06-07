
import { useState } from "react";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { PayeeClassification } from "@/lib/types";
import { useTableSorting } from "@/hooks/useTableSorting";
import ClassificationTableHeader from "./table/TableHeader";
import TableCellComponent from "./table/TableCell";
import ExportButtons from "./table/ExportButtons";
import DetailsModal from "./table/DetailsModal";

interface ClassificationResultTableProps {
  results: PayeeClassification[];
}

const ClassificationResultTable = ({ results }: ClassificationResultTableProps) => {
  const [selectedResult, setSelectedResult] = useState<PayeeClassification | null>(null);
  
  // Filter out any potentially invalid results
  const validResults = results.filter(result => result && result.result);
  
  console.log('[CLASSIFICATION TABLE] Valid results:', {
    originalCount: results.length,
    validCount: validResults.length
  });
  
  if (validResults.length === 0) {
    return (
      <div className="text-center py-8 border rounded-md">
        <p className="text-muted-foreground">No valid results to display.</p>
      </div>
    );
  }

  // Get all original data columns from ALL results
  const allOriginalColumns = new Set<string>();
  validResults.forEach(result => {
    if (result.originalData) {
      Object.keys(result.originalData).forEach(key => allOriginalColumns.add(key));
    }
  });
  const originalColumns = Array.from(allOriginalColumns);
  
  console.log('[CLASSIFICATION TABLE] Original columns detected:', originalColumns);
  
  // Define classification columns
  const classificationColumns = [
    { key: 'classification', label: 'Classification' },
    { key: 'confidence', label: 'Confidence' },
    { key: 'processingTier', label: 'Processing Tier' },
    { key: 'reasoning', label: 'Reasoning' }
  ];
  
  // Define keyword exclusion columns
  const keywordColumns = [
    { key: 'keywordExclusion', label: 'Excluded by Keywords' },
    { key: 'matchedKeywords', label: 'Matched Keywords' },
    { key: 'keywordReasoning', label: 'Keyword Reasoning' }
  ];
  
  // All columns for the table
  const allColumns = [
    ...originalColumns.map(col => ({ key: col, label: col, isOriginal: true })),
    ...classificationColumns.map(col => ({ ...col, isOriginal: false })),
    ...keywordColumns.map(col => ({ ...col, isOriginal: false })),
    { key: 'details', label: 'Details', isOriginal: false }
  ];
  
  console.log('[CLASSIFICATION TABLE] All columns for table:', allColumns.map(c => c.label));
  
  const { sortField, sortDirection, sortedResults, handleSort } = useTableSorting(validResults, originalColumns);
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-muted-foreground">
          Showing {validResults.length} results with {originalColumns.length} original columns + classification data + keyword exclusions
        </div>
        <ExportButtons results={results} />
      </div>

      <div className="border rounded-md overflow-x-auto">
        <Table>
          <ClassificationTableHeader 
            columns={allColumns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
          <TableBody>
            {sortedResults.map((result, index) => (
              <TableRow key={`${result.id}-${index}`}>
                {allColumns.map((column) => (
                  <TableCell key={column.key} className="whitespace-nowrap">
                    <TableCellComponent 
                      result={result} 
                      column={column} 
                      onViewDetails={setSelectedResult}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DetailsModal 
        selectedResult={selectedResult} 
        onClose={() => setSelectedResult(null)} 
      />
    </div>
  );
};

export default ClassificationResultTable;
