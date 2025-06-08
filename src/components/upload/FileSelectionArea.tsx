
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileSelectionAreaProps {
  onFileSelect: () => void;
  disabled?: boolean;
}

const FileSelectionArea = ({ onFileSelect, disabled = false }: FileSelectionAreaProps) => {
  return (
    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
      <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="font-medium mb-2">Upload Your Payee File</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Upload an Excel or CSV file containing payee information
      </p>
      <Button onClick={onFileSelect} size="lg" disabled={disabled}>
        Choose File
      </Button>
      <p className="text-xs text-muted-foreground mt-2">
        Supports Excel (.xlsx, .xls) and CSV files
      </p>
    </div>
  );
};

export default FileSelectionArea;
