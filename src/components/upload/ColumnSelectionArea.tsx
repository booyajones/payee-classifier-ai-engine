
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Clock, AlertTriangle, FileText, Users, Copy } from 'lucide-react';
import { FileProcessingInfo } from '@/hooks/useSmartFileUpload';

interface ColumnSelectionAreaProps {
  fileHeaders: string[];
  selectedColumn: string;
  onColumnChange: (value: string) => void;
  onProcess: () => void;
  onCancel: () => void;
  recordCount: number;
  processingInfo?: FileProcessingInfo;
  disabled?: boolean;
}

const ColumnSelectionArea = ({ 
  fileHeaders, 
  selectedColumn, 
  onColumnChange, 
  onProcess, 
  onCancel, 
  recordCount,
  processingInfo = {},
  disabled = false 
}: ColumnSelectionAreaProps) => {
  // Auto-select column if it contains "payee" or "name"
  const suggestedColumn = fileHeaders.find(
    col => col.toLowerCase().includes('payee') || 
           col.toLowerCase().includes('vendor') || 
           col.toLowerCase().includes('name')
  );

  const handleColumnChange = (value: string) => {
    onColumnChange(value);
    if (!selectedColumn && suggestedColumn && value === suggestedColumn) {
      // Auto-selected suggested column
    }
  };

  return (
    <div className="space-y-4">
      {/* File Summary */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-blue-500" />
          <span className="font-medium text-sm">File Summary</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span>{recordCount.toLocaleString()} total rows</span>
          </div>
          {processingInfo.uniquePayees && (
            <div className="flex items-center gap-2">
              <Users className="h-3 w-3 text-green-600" />
              <span>{processingInfo.uniquePayees.toLocaleString()} unique payees</span>
            </div>
          )}
          {processingInfo.duplicates && processingInfo.duplicates > 0 && (
            <div className="flex items-center gap-2">
              <Copy className="h-3 w-3 text-orange-500" />
              <span>{processingInfo.duplicates.toLocaleString()} duplicates</span>
            </div>
          )}
          {processingInfo.estimatedTime && (
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-blue-500" />
              <span>~{processingInfo.estimatedTime}</span>
            </div>
          )}
        </div>
      </div>

      {/* Size Warning */}
      {processingInfo.sizeWarning && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{processingInfo.sizeWarning}</AlertDescription>
        </Alert>
      )}

      {/* Column Selection */}
      <div className="space-y-2">
        <Label htmlFor="column-select">Select column containing payee names</Label>
        <Select value={selectedColumn} onValueChange={handleColumnChange} disabled={disabled}>
          <SelectTrigger id="column-select">
            <SelectValue placeholder="Choose a column..." />
          </SelectTrigger>
          <SelectContent>
            {fileHeaders.map((column) => (
              <SelectItem key={column} value={column}>
                {column}
                {column === suggestedColumn && (
                  <span className="ml-2 text-xs text-green-600">(suggested)</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {suggestedColumn && !selectedColumn && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-3 w-3" />
            <span>We suggest "{suggestedColumn}" column based on its name</span>
          </div>
        )}
      </div>

      {/* Processing Info */}
      {selectedColumn && processingInfo.estimatedTime && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <div>Estimated processing time: <strong>{processingInfo.estimatedTime}</strong></div>
              <div className="text-xs text-muted-foreground">
                Large files are processed using OpenAI's Batch API for cost efficiency. 
                You can leave this page - we'll save your progress automatically.
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button 
          onClick={onProcess} 
          disabled={!selectedColumn || disabled}
          className="flex-1"
        >
          {processingInfo.estimatedTime ? 
            `Process File (~${processingInfo.estimatedTime})` : 
            'Process File'
          }
        </Button>
        <Button 
          variant="outline" 
          onClick={onCancel}
          disabled={disabled}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default ColumnSelectionArea;
