
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database } from "lucide-react";

interface ColumnSelectionSectionProps {
  columns: string[];
  selectedColumn: string;
  onColumnChange: (value: string) => void;
  fileInfo: { rowCount?: number; payeeCount?: number } | null;
}

const ColumnSelectionSection = ({ 
  columns, 
  selectedColumn, 
  onColumnChange, 
  fileInfo 
}: ColumnSelectionSectionProps) => {
  if (columns.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label htmlFor="column-select">Select column with payee names</Label>
      <Select value={selectedColumn} onValueChange={onColumnChange}>
        <SelectTrigger id="column-select">
          <SelectValue placeholder="Select a column" />
        </SelectTrigger>
        <SelectContent>
          {columns.map((column) => (
            <SelectItem key={column} value={column}>
              {column}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {fileInfo && selectedColumn && (
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Found {fileInfo.rowCount} rows, {fileInfo.payeeCount} unique payee names</p>
          {fileInfo.rowCount && fileInfo.rowCount > 10000 && (
            <p className="text-blue-600">
              <Database className="h-3 w-3 inline mr-1" />
              Large file detected - optimized database operations will be used
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ColumnSelectionSection;
