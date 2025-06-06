
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PayeeClassification } from "@/lib/types";
import ClassificationBadge from "./ClassificationBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Download } from "lucide-react";
import { downloadCSV, downloadJSON } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ClassificationResultTableProps {
  results: PayeeClassification[];
}

type SortDirection = 'asc' | 'desc';

const ClassificationResultTable = ({ results }: ClassificationResultTableProps) => {
  const [sortField, setSortField] = useState<string>('payeeName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedResult, setSelectedResult] = useState<PayeeClassification | null>(null);
  
  // Filter out any potentially invalid results
  const validResults = results.filter(result => result && result.result);
  
  console.log('[CLASSIFICATION TABLE] Debug - validResults:', validResults.length);
  console.log('[CLASSIFICATION TABLE] Debug - first result:', validResults[0]);
  console.log('[CLASSIFICATION TABLE] Debug - originalData structure:', validResults[0]?.originalData);
  console.log('[CLASSIFICATION TABLE] Debug - keyword exclusion:', validResults[0]?.result?.keywordExclusion);
  
  if (validResults.length === 0) {
    return (
      <div className="text-center py-8 border rounded-md">
        <p className="text-muted-foreground">No valid results to display.</p>
      </div>
    );
  }

  // Get all original data columns from ALL results (not just first one)
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
  
  // Define keyword exclusion columns - these are MANDATORY
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
  
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const sortedResults = [...validResults].sort((a, b) => {
    let comparison = 0;
    
    // Handle original data columns
    if (originalColumns.includes(sortField)) {
      const aValue = a.originalData?.[sortField] || '';
      const bValue = b.originalData?.[sortField] || '';
      comparison = String(aValue).localeCompare(String(bValue));
    } else {
      // Handle classification columns
      switch (sortField) {
        case 'classification':
          comparison = a.result.classification.localeCompare(b.result.classification);
          break;
        case 'confidence':
          comparison = a.result.confidence - b.result.confidence;
          break;
        case 'processingTier':
          comparison = (a.result.processingTier || '').localeCompare(b.result.processingTier || '');
          break;
        case 'keywordExclusion':
          const aExcluded = a.result.keywordExclusion?.isExcluded ? 'Yes' : 'No';
          const bExcluded = b.result.keywordExclusion?.isExcluded ? 'Yes' : 'No';
          comparison = aExcluded.localeCompare(bExcluded);
          break;
        default:
          comparison = a.payeeName.localeCompare(b.payeeName);
      }
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });
  
  const sortIcon = (field: string) => {
    if (field === sortField) {
      return sortDirection === 'asc' ? <ArrowUp className="inline w-4 h-4" /> : <ArrowDown className="inline w-4 h-4" />;
    }
    return null;
  };
  
  const renderCellValue = (result: PayeeClassification, column: any) => {
    console.log('[CLASSIFICATION TABLE] Rendering cell for column:', column.key, 'isOriginal:', column.isOriginal);
    
    if (column.isOriginal) {
      const value = result.originalData?.[column.key];
      console.log('[CLASSIFICATION TABLE] Original data value for', column.key, ':', value);
      return value || '';
    }
    
    switch (column.key) {
      case 'classification':
        return (
          <Badge variant={result.result.classification === 'Business' ? 'default' : 'secondary'}>
            {result.result.classification}
          </Badge>
        );
      case 'confidence':
        return <ClassificationBadge confidence={result.result.confidence} />;
      case 'processingTier':
        return result.result.processingTier || 'N/A';
      case 'reasoning':
        return (
          <div className="max-w-xs truncate" title={result.result.reasoning}>
            {result.result.reasoning}
          </div>
        );
      case 'keywordExclusion':
        const isExcluded = result.result.keywordExclusion?.isExcluded;
        console.log('[CLASSIFICATION TABLE] Keyword exclusion for result:', isExcluded, result.result.keywordExclusion);
        return (
          <Badge variant={isExcluded ? 'destructive' : 'secondary'}>
            {isExcluded ? 'Yes' : 'No'}
          </Badge>
        );
      case 'matchedKeywords':
        const keywords = result.result.keywordExclusion?.matchedKeywords || [];
        console.log('[CLASSIFICATION TABLE] Matched keywords:', keywords);
        return keywords.length > 0 ? keywords.join(', ') : '-';
      case 'keywordReasoning':
        const reasoning = result.result.keywordExclusion?.reasoning;
        console.log('[CLASSIFICATION TABLE] Keyword reasoning:', reasoning);
        return reasoning || '-';
      case 'details':
        return (
          <Button variant="ghost" size="sm" onClick={() => setSelectedResult(result)}>
            View Details
          </Button>
        );
      default:
        return '';
    }
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-muted-foreground">
          Showing {validResults.length} results with {originalColumns.length} original columns + classification data + keyword exclusions
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadCSV(results)}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadJSON(results)}>
            <Download className="w-4 h-4 mr-2" /> Export JSON
          </Button>
        </div>
      </div>

      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {allColumns.map((column) => (
                <TableHead 
                  key={column.key} 
                  className="cursor-pointer whitespace-nowrap min-w-[120px]" 
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.label} {sortIcon(column.key)}
                    {column.isOriginal && (
                      <span className="text-xs text-blue-600 font-normal">(Original)</span>
                    )}
                    {column.key.startsWith('keyword') && (
                      <span className="text-xs text-orange-600 font-normal">(Exclusion)</span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedResults.map((result) => (
              <TableRow key={result.id}>
                {allColumns.map((column) => (
                  <TableCell key={column.key} className="whitespace-nowrap">
                    {renderCellValue(result, column)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedResult} onOpenChange={(open) => !open && setSelectedResult(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedResult && selectedResult.result && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedResult.payeeName}</DialogTitle>
                <DialogDescription>Complete Classification Details</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="flex justify-between">
                  <span className="font-medium">Classification:</span>
                  <Badge variant={selectedResult.result.classification === 'Business' ? 'default' : 'secondary'}>
                    {selectedResult.result.classification}
                  </Badge>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Confidence:</span>
                  <ClassificationBadge confidence={selectedResult.result.confidence} />
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Processing Tier:</span>
                  <span>{selectedResult.result.processingTier}</span>
                </div>
                
                <div>
                  <h4 className="font-medium mb-1">Reasoning:</h4>
                  <p className="text-sm">{selectedResult.result.reasoning}</p>
                </div>
                
                {selectedResult.result.keywordExclusion && (
                  <div>
                    <h4 className="font-medium mb-1">Keyword Exclusion:</h4>
                    <div className="text-sm space-y-1">
                      <div>Excluded: {selectedResult.result.keywordExclusion.isExcluded ? 'Yes' : 'No'}</div>
                      {selectedResult.result.keywordExclusion.matchedKeywords.length > 0 && (
                        <div>Keywords: {selectedResult.result.keywordExclusion.matchedKeywords.join(', ')}</div>
                      )}
                      <div>Reasoning: {selectedResult.result.keywordExclusion.reasoning}</div>
                    </div>
                  </div>
                )}
                
                {selectedResult.result.matchingRules && selectedResult.result.matchingRules.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-1">Matching Rules:</h4>
                    <ul className="text-sm space-y-1 list-disc pl-5">
                      {selectedResult.result.matchingRules.map((rule, index) => (
                        <li key={index}>{rule}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassificationResultTable;
