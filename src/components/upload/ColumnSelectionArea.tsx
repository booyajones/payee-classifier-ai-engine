
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ColumnSelectionAreaProps {
  fileHeaders: string[];
  selectedColumn: string;
  onColumnChange: (value: string) => void;
  onProcess: () => void;
  onCancel: () => void;
  recordCount: number;
  disabled?: boolean;
}

const ColumnSelectionArea = ({
  fileHeaders,
  selectedColumn,
  onColumnChange,
  onProcess,
  onCancel,
  recordCount,
  disabled = false
}: ColumnSelectionAreaProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle className="h-5 w-5" />
        <span className="font-medium">File uploaded successfully!</span>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="payee-column">Select the column containing payee names:</Label>
        <Select value={selectedColumn} onValueChange={onColumnChange} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a column..." />
          </SelectTrigger>
          <SelectContent>
            {fileHeaders.map((header) => (
              <SelectItem key={header} value={header}>
                {header}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button 
          onClick={onProcess} 
          disabled={!selectedColumn || disabled}
          className="flex-1"
        >
          Process {recordCount} Records
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={disabled}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default ColumnSelectionArea;
