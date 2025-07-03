import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, AlertTriangle, FileText, Users, Copy } from 'lucide-react';

const ColumnSelectionArea = ({ 
  fileHeaders,
  selectedColumn,
  onColumnChange,
  onProcess,
  onCancel,
  recordCount,
  processingInfo = {},
  disabled = false
}) => {
  const hasHeaders = fileHeaders && fileHeaders.length > 0;
  const hasSelection = selectedColumn && selectedColumn.length > 0;
  const canProcess = hasHeaders && hasSelection && recordCount > 0 && !disabled;

  const getSuggestedColumns = () => {
    if (!fileHeaders) return [];
    return fileHeaders.filter(header =>
      header && /payee|vendor|supplier|company|name|recipient|merchant/i.test(header)
    );
  };

  const suggestedColumns = getSuggestedColumns();

  const handleCopyColumn = async () => {
    if (selectedColumn) {
      try {
        await navigator.clipboard.writeText(selectedColumn);
      } catch (error) {
        productionLogger.debug('Failed to copy column name:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Column Selection */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label htmlFor="column-select" className="text-sm font-medium">
            Select Payee Column
          </Label>
          {selectedColumn && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyColumn}
              className="h-6 px-2"
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        <Select 
          value={selectedColumn} 
          onValueChange={onColumnChange}
          disabled={!hasHeaders || disabled}
        >
          <SelectTrigger id="column-select" className="w-full">
            <SelectValue placeholder={hasHeaders ? "Choose the column containing payee names..." : "No columns available"} />
          </SelectTrigger>
          <SelectContent>
            {hasHeaders ? (
              fileHeaders.map((header) => (
                <SelectItem key={header} value={header}>
                  {header}
                  {suggestedColumns.includes(header) && (
                    <span className="ml-2 text-xs text-green-600">Suggested</span>
                  )}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="no-headers" disabled>
                No headers found
              </SelectItem>
            )}
          </SelectContent>
        </Select>

        {/* Suggestions Info */}
        {suggestedColumns.length > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">Suggested columns:</span> {suggestedColumns.join(', ')}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* File Information */}
      {processingInfo.fileInfo && (
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">File Size</p>
              <p className="text-xs text-muted-foreground">
                {(processingInfo.fileInfo.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Total Records</p>
              <p className="text-xs text-muted-foreground">
                {recordCount.toLocaleString()} rows
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selection Status */}
      {hasSelection && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Selected column: <strong>{selectedColumn}</strong>
            {recordCount > 0 && (
              <span> • {recordCount.toLocaleString()} records will be processed</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Warnings */}
      {!hasHeaders && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No column headers detected. Please ensure your file has headers in the first row.
          </AlertDescription>
        </Alert>
      )}

      {recordCount === 0 && hasHeaders && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No data rows found. Please check that your file contains data beyond the headers.
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={onProcess}
          disabled={!canProcess}
          className="flex-1"
        >
          Process File
        </Button>
        
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={disabled}
        >
          Cancel
        </Button>
      </div>

      {/* Help Text */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Choose the column that contains the names of vendors, suppliers, or payees you want to classify.
          The system will analyze each unique name and categorize it as either Individual or Business.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default ColumnSelectionArea;