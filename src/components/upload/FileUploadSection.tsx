
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, File } from "lucide-react";
import { ValidationStatus } from "@/hooks/useFileUploadForm";
import FileValidationIndicator from "./FileValidationIndicator";

interface FileUploadSectionProps {
  file: File | null;
  validationStatus: ValidationStatus;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const FileUploadSection = ({ file, validationStatus, onFileChange }: FileUploadSectionProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="file-upload">Upload Excel or CSV file</Label>
      <div className="flex items-center gap-2">
        <Button 
          type="button" 
          variant="outline" 
          className="w-full"
          onClick={() => document.getElementById('file-upload')?.click()}
          disabled={validationStatus === 'validating'}
        >
          <Upload className="h-4 w-4 mr-2" />
          {file ? 'Change File' : 'Select File'}
        </Button>
        {file && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <File className="h-4 w-4" />
            <span>{file.name}</span>
            <FileValidationIndicator status={validationStatus} />
          </div>
        )}
      </div>
      <input
        id="file-upload"
        type="file"
        className="hidden"
        accept=".xlsx,.xls,.csv"
        onChange={onFileChange}
      />
      <p className="text-xs text-muted-foreground">
        Accepted formats: Excel (.xlsx, .xls) or CSV files. 
        <span className="text-green-600 font-medium">Instant batch creation with background data optimization for large files up to 500MB.</span>
      </p>
    </div>
  );
};

export default FileUploadSection;
