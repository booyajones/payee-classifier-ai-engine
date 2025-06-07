
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
  
  const validResults = results.filter(result => result && result.result);
  
  if (validResults.length === 0) {
    return (
      <div className="text-center py-8 border rounded-md">
        <p className="text-muted-foreground">No valid results to display.</p>
      </div>
    );
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
  
  const { sortField, sortDirection, sortedResults, handleSort } = useTableSorting(validResults, originalColumns);
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-muted-foreground">
          Showing {validResults.length} results
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
