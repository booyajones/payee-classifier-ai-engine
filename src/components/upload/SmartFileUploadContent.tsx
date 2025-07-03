// @ts-nocheck
import { useCallback, useMemo, useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UploadCloud, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SmartFileUploadContentProps {
  onFileUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  uploadError?: string;
  lastUploadedFileName?: string;
  lastUploadSuccess?: boolean;
}

const SmartFileUploadContent = ({
  onFileUpload,
  isUploading,
  uploadError,
  lastUploadedFileName,
  lastUploadSuccess
}: SmartFileUploadContentProps) => {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  }, []);

  const handleUploadClick = useCallback(async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload.",
        variant: "destructive"
      });
      return;
    }
    try {
      await onFileUpload(selectedFile);
      setSelectedFile(null);
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred during upload.",
        variant: "destructive"
      });
    }
  }, [selectedFile, onFileUpload, toast]);

  const fileNameDisplay = useMemo(() => {
    if (selectedFile) {
      return selectedFile.name;
    }
    if (lastUploadedFileName) {
      return lastUploadedFileName;
    }
    return "No file selected";
  }, [selectedFile, lastUploadedFileName]);

  useEffect(() => {
    if (uploadError) {
      toast({
        title: "Upload Error",
        description: uploadError,
        variant: "destructive"
      });
    }
  }, [uploadError, toast]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
        >
          <UploadCloud className="h-5 w-5" />
          Select File
        </label>
        <input
          id="file-upload"
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />
        <span className="text-sm text-muted-foreground truncate max-w-xs">{fileNameDisplay}</span>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleUploadClick}
          disabled={isUploading || !selectedFile}
          className="flex-1"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            "Upload"
          )}
        </Button>
        {lastUploadSuccess && (
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Uploaded Successfully
          </Badge>
        )}
        {uploadError && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-4 w-4 text-red-600" />
            Upload Failed
          </Badge>
        )}
      </div>

      <Alert variant="info" className="text-sm">
        <AlertDescription>
          Supported file types: CSV, XLSX, XLS. Files should contain payee data for classification.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default SmartFileUploadContent;
