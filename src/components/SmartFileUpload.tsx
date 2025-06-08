import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Upload, FileCheck, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { parseUploadedFile } from '@/lib/utils';
import { validateFile, validatePayeeData } from '@/lib/fileValidation';
import { createPayeeRowMapping, PayeeRowData } from '@/lib/rowMapping';
import { useSmartBatchManager } from '@/hooks/useSmartBatchManager';
import { useUnifiedProgress } from '@/contexts/UnifiedProgressContext';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import BatchProcessingProgress from './BatchProcessingProgress';

interface SmartFileUploadProps {
  onBatchJobCreated: (batchJob: BatchJob, payeeRowData: PayeeRowData) => void;
  onProcessingComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
}

const SmartFileUpload = ({ onBatchJobCreated, onProcessingComplete }: SmartFileUploadProps) => {
  const [uploadState, setUploadState] = useState<'idle' | 'uploaded' | 'processing' | 'complete' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [currentJob, setCurrentJob] = useState<BatchJob | null>(null);
  const [fileData, setFileData] = useState<any[] | null>(null);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [selectedPayeeColumn, setSelectedPayeeColumn] = useState<string>('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { createSmartBatchJob, getSmartState } = useSmartBatchManager();
  const { updateProgress, getProgress, completeProgress, clearProgress } = useUnifiedProgress();
  const { toast } = useToast();

  const UPLOAD_ID = 'file-upload';

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadState('processing');
    updateProgress(UPLOAD_ID, 'Analyzing file structure...', 10);
    setErrorMessage('');
    setSuggestions([]);
    setFileName(file.name);

    try {
      // Validate file
      const fileValidation = validateFile(file);
      if (!fileValidation.isValid) {
        setUploadState('error');
        setErrorMessage(fileValidation.error!.message);
        setSuggestions(getSuggestions(fileValidation.error!.code));
        clearProgress(UPLOAD_ID);
        return;
      }

      updateProgress(UPLOAD_ID, 'Reading file contents...', 30);

      // Parse file data
      const data = await parseUploadedFile(file);
      if (!data || data.length === 0) {
        setUploadState('error');
        setErrorMessage('No data found in the file. Please check if the file has content.');
        setSuggestions(['Ensure the file has data rows', 'Try a different file format']);
        clearProgress(UPLOAD_ID);
        return;
      }

      // Get headers
      const headers = Object.keys(data[0]);
      if (headers.length === 0) {
        setUploadState('error');
        setErrorMessage('No columns found in the file.');
        setSuggestions(['Ensure the file has a header row', 'Try a different file format']);
        clearProgress(UPLOAD_ID);
        return;
      }

      updateProgress(UPLOAD_ID, 'File uploaded successfully! Please select the payee column.', 60);
      
      setFileData(data);
      setFileHeaders(headers);
      setUploadState('uploaded');
      completeProgress(UPLOAD_ID, 'File uploaded successfully!');

    } catch (error) {
      console.error('[SMART UPLOAD] Upload failed:', error);
      setUploadState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
      setSuggestions(['Try again with a different file', 'Check your internet connection']);
      clearProgress(UPLOAD_ID);
    }
  };

  const handleColumnSelect = async () => {
    if (!fileData || !selectedPayeeColumn) return;

    setUploadState('processing');
    updateProgress(UPLOAD_ID, 'Validating payee data...', 10);

    try {
      // Validate payee data
      const dataValidation = validatePayeeData(fileData, selectedPayeeColumn);
      if (!dataValidation.isValid) {
        setUploadState('error');
        setErrorMessage(dataValidation.error!.message);
        setSuggestions(getSuggestions(dataValidation.error!.code));
        clearProgress(UPLOAD_ID);
        return;
      }

      updateProgress(UPLOAD_ID, 'Creating payee mappings...', 30);

      // Create row mapping
      const payeeRowData = createPayeeRowMapping(fileData, selectedPayeeColumn);

      updateProgress(UPLOAD_ID, 'Creating batch job...', 50);

      // Create smart batch job with progress tracking
      const job = await createSmartBatchJob(
        payeeRowData,
        `Upload: ${fileName}`,
        (updatedJob) => {
          console.log(`[SMART UPLOAD] Job ${updatedJob.id} updated: ${updatedJob.status}`);
          setCurrentJob(updatedJob);
          
          // Update progress with job ID for unified tracking
          const smartState = getSmartState(updatedJob.id);
          updateProgress(UPLOAD_ID, smartState.currentStage, smartState.progress, smartState.currentStage, updatedJob.id);
        },
        (results, summary, jobId) => {
          console.log(`[SMART UPLOAD] Job ${jobId} completed with ${results.length} results`);
          setUploadState('complete');
          completeProgress(UPLOAD_ID, `Successfully processed ${results.length} payees!`);
          onProcessingComplete(results, summary, jobId);
        }
      );

      if (job) {
        setCurrentJob(job);
        setUploadState('processing');
        updateProgress(UPLOAD_ID, 'Batch job created! Processing payee classifications...', 70, 'OpenAI batch processing started', job.id);
        onBatchJobCreated(job, payeeRowData);
      } else {
        setUploadState('complete');
        completeProgress(UPLOAD_ID, 'Processing completed using enhanced local classification!');
      }

      toast({
        title: "Processing Started",
        description: `Processing ${payeeRowData.uniquePayeeNames.length} unique payees from ${fileName}.`,
      });

    } catch (error) {
      console.error('[SMART UPLOAD] Processing failed:', error);
      setUploadState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Processing failed');
      setSuggestions(['Try again', 'Check your data format']);
      clearProgress(UPLOAD_ID);
    }
  };

  const resetUpload = () => {
    setUploadState('idle');
    setErrorMessage('');
    setSuggestions([]);
    setCurrentJob(null);
    setFileData(null);
    setFileHeaders([]);
    setSelectedPayeeColumn('');
    setFileName('');
    clearProgress(UPLOAD_ID);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const getStatusIcon = () => {
    switch (uploadState) {
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Upload className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getSuggestions = (errorCode: string): string[] => {
    switch (errorCode) {
      case 'FILE_TOO_LARGE':
        return ['Try splitting the file into smaller chunks', 'Remove unnecessary columns', 'Use CSV format instead of Excel'];
      case 'INVALID_FILE_FORMAT':
        return ['Use .xlsx, .xls, or .csv format', 'Check if the file is corrupted', 'Export from your accounting software again'];
      case 'NO_VALID_PAYEES':
        return ['Ensure the payee column contains names', 'Check for empty cells', 'Remove header/footer rows'];
      default:
        return ['Try re-saving the file', 'Check file permissions', 'Use a different browser'];
    }
  };

  const isProcessing = uploadState === 'processing';
  const currentProgress = getProgress(UPLOAD_ID);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          File Upload & Classification
        </CardTitle>
        <CardDescription>
          Upload your payee file and select the column containing payee names
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          disabled={isProcessing}
        />

        {uploadState === 'idle' && (
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">Upload Your Payee File</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload an Excel or CSV file containing payee information
            </p>
            <Button onClick={triggerFileSelect} size="lg">
              Choose File
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Supports Excel (.xlsx, .xls) and CSV files
            </p>
          </div>
        )}

        {uploadState === 'uploaded' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">File uploaded successfully!</span>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="payee-column">Select the column containing payee names:</Label>
              <Select value={selectedPayeeColumn} onValueChange={setSelectedPayeeColumn}>
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
                onClick={handleColumnSelect} 
                disabled={!selectedPayeeColumn}
                className="flex-1"
              >
                Process {fileData?.length || 0} Records
              </Button>
              <Button variant="outline" onClick={resetUpload}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {isProcessing && currentProgress && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="font-medium">{currentProgress.stage}</span>
            </div>
            <BatchProcessingProgress 
              progress={currentProgress.percentage} 
              status={currentProgress.stage} 
            />
            {currentProgress.jobId && (
              <p className="text-xs text-muted-foreground">
                Job ID: {currentProgress.jobId}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              This may take a few minutes depending on file size. You can leave this page - we'll save your progress.
            </p>
          </div>
        )}

        {uploadState === 'complete' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{currentProgress?.message || 'Processing completed successfully!'}</span>
              <Button variant="outline" size="sm" onClick={resetUpload}>
                Upload Another File
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {uploadState === 'error' && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
            
            {suggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Suggestions:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-xs mt-1">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <Button variant="outline" onClick={resetUpload} className="w-full">
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SmartFileUpload;
