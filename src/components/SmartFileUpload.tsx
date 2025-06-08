
import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileCheck, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useIntelligentFileProcessor } from '@/hooks/useIntelligentFileProcessor';
import { useSmartBatchManager } from '@/hooks/useSmartBatchManager';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';

interface SmartFileUploadProps {
  onBatchJobCreated: (batchJob: BatchJob, payeeRowData: PayeeRowData) => void;
  onProcessingComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
}

const SmartFileUpload = ({ onBatchJobCreated, onProcessingComplete }: SmartFileUploadProps) => {
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [currentJob, setCurrentJob] = useState<BatchJob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { processFileIntelligently, isProcessing: isFileProcessing } = useIntelligentFileProcessor();
  const { createSmartBatchJob, getSmartState } = useSmartBatchManager();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadState('uploading');
    setProgress(10);
    setStatusMessage('Analyzing file structure...');
    setErrorMessage('');
    setSuggestions([]);

    try {
      // Step 1: Intelligent file processing
      const result = await processFileIntelligently(file);
      
      if (!result.success) {
        setUploadState('error');
        setErrorMessage(result.errorMessage || 'File processing failed');
        setSuggestions(result.suggestions || []);
        setProgress(0);
        return;
      }

      setProgress(30);
      setStatusMessage('File validated successfully! Creating batch job...');

      // Step 2: Create smart batch job
      const job = await createSmartBatchJob(
        result.payeeRowData!,
        `Smart upload: ${file.name}`,
        (updatedJob) => {
          setCurrentJob(updatedJob);
          const smartState = getSmartState(updatedJob.id);
          setProgress(smartState.progress);
          setStatusMessage(smartState.currentStage);
        },
        (results, summary, jobId) => {
          setUploadState('complete');
          setProgress(100);
          setStatusMessage(`Successfully processed ${results.length} payees!`);
          onProcessingComplete(results, summary, jobId);
        }
      );

      if (job) {
        setCurrentJob(job);
        setUploadState('processing');
        setProgress(50);
        setStatusMessage('Batch job created! Processing payee classifications...');
        onBatchJobCreated(job, result.payeeRowData!);
      } else {
        // Local processing completed immediately
        setUploadState('complete');
        setProgress(100);
        setStatusMessage('Processing completed using enhanced local classification!');
      }

    } catch (error) {
      console.error('[SMART UPLOAD] Upload failed:', error);
      setUploadState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
      setSuggestions(['Try again with a different file', 'Check your internet connection']);
      setProgress(0);
    }
  };

  const resetUpload = () => {
    setUploadState('idle');
    setProgress(0);
    setStatusMessage('');
    setErrorMessage('');
    setSuggestions([]);
    setCurrentJob(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const getStatusIcon = () => {
    switch (uploadState) {
      case 'uploading':
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

  const isProcessing = uploadState === 'uploading' || uploadState === 'processing' || isFileProcessing;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          Smart File Upload
        </CardTitle>
        <CardDescription>
          Simply upload your file - we'll handle everything automatically!
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
              We'll automatically detect columns, validate data, and process classifications
            </p>
            <Button onClick={triggerFileSelect} size="lg">
              Choose File
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Supports Excel (.xlsx, .xls) and CSV files
            </p>
          </div>
        )}

        {isProcessing && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="font-medium">{statusMessage}</span>
            </div>
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground">
              This may take a few minutes depending on file size. You can leave this page - we'll save your progress.
            </p>
          </div>
        )}

        {uploadState === 'complete' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{statusMessage}</span>
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
