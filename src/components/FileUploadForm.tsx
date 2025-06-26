
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { parseUploadedFile } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, File, Upload, RotateCcw, CheckCircle, Loader2, Database } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ClassificationConfig } from "@/lib/types";
import { createBatchJob, BatchJob } from "@/lib/openai/trueBatchAPI";
import { validateFile, validatePayeeData } from "@/lib/fileValidation";
import { handleError, showErrorToast, showRetryableErrorToast } from "@/lib/errorHandler";
import { useRetry } from "@/hooks/useRetry";
import { createPayeeRowMapping, PayeeRowData } from "@/lib/rowMapping";
import { saveBatchJob } from "@/lib/database/batchJobService";

interface FileUploadFormProps {
  onBatchJobCreated: (batchJob: BatchJob, payeeRowData: PayeeRowData) => void;
  config?: ClassificationConfig;
}

const FileUploadForm = ({ 
  onBatchJobCreated,
  config = {
    aiThreshold: 80,
    bypassRuleNLP: true,
    useEnhanced: true,
    offlineMode: false,
    useFuzzyMatching: true,
    similarityThreshold: 85
  }
}: FileUploadFormProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<'none' | 'validating' | 'valid' | 'error'>('none');
  const [fileInfo, setFileInfo] = useState<{ rowCount?: number; payeeCount?: number } | null>(null);
  const { toast } = useToast();

  // Retry mechanism for batch job creation
  const {
    execute: createBatchJobWithRetry,
    isRetrying,
    retryCount
  } = useRetry(createBatchJob, { maxRetries: 3, baseDelay: 2000 });

  const resetForm = () => {
    setFile(null);
    setColumns([]);
    setSelectedColumn("");
    setFileError(null);
    setValidationStatus('none');
    setFileInfo(null);
    
    // Reset the file input
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = "";
    
    toast({
      title: "Form Reset",
      description: "The file upload form has been reset. You can now start over.",
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    setColumns([]);
    setSelectedColumn("");
    setValidationStatus('none');
    setFileInfo(null);
    
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setValidationStatus('validating');

    try {
      // Validate file first
      const fileValidation = validateFile(selectedFile);
      if (!fileValidation.isValid) {
        setFileError(fileValidation.error!.message);
        setValidationStatus('error');
        setFile(null);
        showErrorToast(fileValidation.error!, 'File Validation');
        return;
      }

      setFile(selectedFile);
      
      // Parse headers only to get column names
      const headers = await parseUploadedFile(selectedFile, true);
      if (!headers || headers.length === 0) {
        throw new Error('No columns found in the file');
      }

      setColumns(headers);
      
      // Auto-select column if it contains "payee" or "name"
      const payeeColumn = headers.find(
        col => col.toLowerCase().includes('payee') || col.toLowerCase().includes('name')
      );
      
      if (payeeColumn) {
        setSelectedColumn(payeeColumn);
      }

      setValidationStatus('valid');
      
      toast({
        title: "File Uploaded Successfully",
        description: `Found ${headers.length} columns. ${payeeColumn ? `Auto-selected "${payeeColumn}" column.` : 'Please select the payee name column.'}`,
      });
    } catch (error) {
      const appError = handleError(error, 'File Upload');
      console.error("Error parsing file:", error);
      setFileError(appError.message);
      setValidationStatus('error');
      setFile(null);
      showErrorToast(appError, 'File Parsing');
    }
  };

  const handleProcess = async () => {
    if (!file || !selectedColumn) {
      toast({
        title: "Error",
        description: "Please upload a file and select a column",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      setValidationStatus('validating');
      
      // Parse the full file to get original data
      const originalFileData = await parseUploadedFile(file);
      console.log('[FILE UPLOAD] Parsed original file data:', originalFileData.length, 'rows');
      
      // Validate payee data
      const dataValidation = validatePayeeData(originalFileData, selectedColumn);
      if (!dataValidation.isValid) {
        setValidationStatus('error');
        showErrorToast(dataValidation.error!, 'Data Validation');
        return;
      }

      // Create proper row mapping
      const payeeRowData = createPayeeRowMapping(originalFileData, selectedColumn);
      
      setFileInfo({
        rowCount: originalFileData.length,
        payeeCount: payeeRowData.uniquePayeeNames.length
      });

      setValidationStatus('valid');

      const isLargeFile = originalFileData.length > 10000;
      const fileSize = file.size;
      const sizeMB = (fileSize / (1024 * 1024)).toFixed(1);

      console.log(`[FILE UPLOAD] Creating batch job for ${payeeRowData.uniquePayeeNames.length} unique payees from ${originalFileData.length} total rows (${sizeMB}MB)`);

      const batchJob = await createBatchJobWithRetry(
        payeeRowData.uniquePayeeNames, 
        `File upload batch: ${file.name}, ${payeeRowData.uniquePayeeNames.length} unique payees from ${originalFileData.length} rows (${sizeMB}MB)`
      );
      
      console.log(`[FILE UPLOAD] Batch job created successfully:`, batchJob);

      try {
        // Save to database with optimized storage (FULL DATA RETENTION)
        await saveBatchJob(batchJob, payeeRowData);
        console.log(`[FILE UPLOAD] Batch job saved to database successfully with complete data`);
        
        toast({
          title: "Batch Job Created & Optimized",
          description: `Successfully submitted ${payeeRowData.uniquePayeeNames.length} unique payees from ${originalFileData.length} total rows (${sizeMB}MB). Full data stored with database optimization. Job ID: ${batchJob.id.slice(-8)}`,
          duration: 6000,
        });

        // Show additional info for large files
        if (isLargeFile) {
          setTimeout(() => {
            toast({
              title: "Large File Optimization Active",
              description: `Your ${originalFileData.length}-row file is being processed with optimized database operations for best performance.`,
              duration: 4000,
            });
          }, 1000);
        }

      } catch (dbError) {
        console.error('[FILE UPLOAD] Database save failed:', dbError);
        
        // Check if it's a timeout error specifically
        const isTimeoutError = dbError instanceof Error && 
          (dbError.message.includes('timeout') || dbError.message.includes('statement timeout'));
        
        if (isTimeoutError) {
          toast({
            title: "Database Timeout - Job Still Active",
            description: "Database save timed out, but your job is still processing. We're working on optimization.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Database Warning", 
            description: "Job created but database save encountered an issue. Job will still process normally.",
            variant: "destructive"
          });
        }
      }

      // Always pass the job data to parent component
      onBatchJobCreated(batchJob, payeeRowData);
      
    } catch (error) {
      const appError = handleError(error, 'Batch Job Creation');
      console.error("Error creating batch job from file:", error);
      
      showRetryableErrorToast(
        appError, 
        () => handleProcess(),
        'Batch Job Creation'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getValidationIcon = () => {
    switch (validationStatus) {
      case 'validating':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const isProcessButtonDisabled = !file || !selectedColumn || isLoading || validationStatus === 'validating' || validationStatus === 'error';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Upload File for Classification
          <span className="text-xs font-normal text-green-600 ml-auto">Optimized Storage</span>
        </CardTitle>
        <CardDescription>
          Upload an Excel or CSV file containing payee names for classification processing. 
          Now with optimized database storage - no data truncation, full file support up to 500MB.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {fileError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{fileError}</AlertDescription>
          </Alert>
        )}
        
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
                {getValidationIcon()}
              </div>
            )}
          </div>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
          />
          <p className="text-xs text-muted-foreground">
            Accepted formats: Excel (.xlsx, .xls) or CSV files. 
            <span className="text-green-600 font-medium">Optimized for large files up to 500MB with full data retention.</span>
          </p>
        </div>
        
        {columns.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="column-select">Select column with payee names</Label>
            <Select value={selectedColumn} onValueChange={setSelectedColumn}>
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
                {fileInfo.rowCount > 10000 && (
                  <p className="text-blue-600">
                    <Database className="h-3 w-3 inline mr-1" />
                    Large file detected - optimized database operations will be used
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        
        <div className="flex gap-2">
          <Button 
            type="button" 
            className="flex-1" 
            disabled={isProcessButtonDisabled}
            onClick={handleProcess}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isRetrying ? `Retrying (${retryCount + 1})...` : "Creating Job..."}
              </>
            ) : (
              "Submit File for Processing"
            )}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            disabled={isLoading}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>

        {/* Optimization info */}
        <div className="text-xs text-muted-foreground bg-green-50 p-2 rounded border border-green-200">
          <div className="flex items-center gap-1 text-green-700 font-medium mb-1">
            <Database className="h-3 w-3" />
            Database Optimization Active
          </div>
          <p>✓ Full data retention for all file sizes</p>
          <p>✓ Optimized JSONB operations with proper indexing</p>
          <p>✓ Chunked operations with automatic retry for large files</p>
          <p>✓ No arbitrary data truncation limits</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUploadForm;
