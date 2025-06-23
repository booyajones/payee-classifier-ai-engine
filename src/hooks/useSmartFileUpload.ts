import { useState, useRef } from 'react';
import { parseUploadedFile } from '@/lib/utils';
import { createPayeeRowMapping, PayeeRowData } from '@/lib/rowMapping';
import { useUnifiedProgress } from '@/contexts/UnifiedProgressContext';
import { useEnhancedFileValidation } from './useEnhancedFileValidation';
import { useMemoryAwareFileProcessor } from './useMemoryAwareFileProcessor';
import { useToast } from '@/hooks/use-toast';

export type UploadState = 'idle' | 'uploaded' | 'processing' | 'complete' | 'error';

export interface FileProcessingInfo {
  estimatedTime?: string;
  sizeWarning?: string;
  totalRows?: number;
  uniquePayees?: number;
  duplicates?: number;
  fileInfo?: {
    size: number;
    type: string;
    lastModified: Date;
    encoding?: string;
    hasHeaders?: boolean;
    estimatedRows?: number;
    columns?: string[];
  };
}

export const useSmartFileUpload = () => {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [fileData, setFileData] = useState<any[] | null>(null);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [selectedPayeeColumn, setSelectedPayeeColumn] = useState<string>('');
  const [fileName, setFileName] = useState('');
  const [processingInfo, setProcessingInfo] = useState<FileProcessingInfo>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { updateProgress, completeProgress, clearProgress } = useUnifiedProgress();
  const { validateFile } = useEnhancedFileValidation();
  const { processWithMemoryManagement, getMemoryStatus } = useMemoryAwareFileProcessor({
    enableMonitoring: true,
    maxChunkSize: 2000,
    memoryThreshold: 0.8
  });
  const { toast } = useToast();

  const UPLOAD_ID = 'file-upload';

  const getSuggestions = (errorCode: string): string[] => {
    switch (errorCode) {
      case 'FILE_TOO_LARGE':
        return [
          'Try splitting the file into smaller chunks (under 100MB)',
          'Remove unnecessary columns to reduce file size',
          'Use CSV format instead of Excel for better efficiency',
          'Consider processing in smaller batches'
        ];
      case 'INVALID_FILE_FORMAT':
        return ['Use .xlsx, .xls, or .csv format', 'Check if the file is corrupted', 'Export from your accounting software again'];
      case 'NO_VALID_PAYEES':
        return ['Ensure the payee column contains names', 'Check for empty cells', 'Remove header/footer rows'];
      default:
        return ['Try re-saving the file', 'Check file permissions', 'Use a different browser'];
    }
  };

  const handleFileSelect = async (file: File) => {
    setUploadState('processing');
    updateProgress(UPLOAD_ID, 'Analyzing file structure...', 10);
    setErrorMessage('');
    setSuggestions([]);
    setFileName(file.name);
    setProcessingInfo({});

    try {
      // Use enhanced file validation
      const validationResult = await validateFile(file, {
        maxFileSize: 100 * 1024 * 1024, // 100MB
        allowedTypes: ['.xlsx', '.xls', '.csv'],
        requireHeaders: true,
        minRows: 1,
        maxRows: 100000
      });

      if (!validationResult.isValid) {
        setUploadState('error');
        setErrorMessage(validationResult.error!.message);
        setSuggestions(getSuggestions(validationResult.error!.code));
        clearProgress(UPLOAD_ID);
        return;
      }

      // Show warnings if any
      if (validationResult.warnings) {
        validationResult.warnings.forEach(warning => {
          toast({
            title: "File Warning",
            description: warning,
            variant: "destructive",
          });
        });
      }

      updateProgress(UPLOAD_ID, 'Reading file contents...', 30);

      // Memory-aware file processing for large files
      const data = await processWithMemoryManagement(
        [file],
        async (files) => {
          const results = [];
          for (const f of files) {
            const parsed = await parseUploadedFile(f);
            results.push(...(parsed || []));
          }
          return results;
        },
        'file-parsing'
      );

      if (!data || data.length === 0) {
        setUploadState('error');
        setErrorMessage('No data found in the file. Please check if the file has content.');
        setSuggestions(['Ensure the file has data rows', 'Try a different file format']);
        clearProgress(UPLOAD_ID);
        return;
      }

      const headers = Object.keys(data[0]);
      if (headers.length === 0) {
        setUploadState('error');
        setErrorMessage('No columns found in the file.');
        setSuggestions(['Ensure the file has a header row', 'Try a different file format']);
        clearProgress(UPLOAD_ID);
        return;
      }

      // Enhanced processing info with file validation details
      const enhancedProcessingInfo: FileProcessingInfo = {
        estimatedTime: validationResult.fileInfo?.estimatedRows ? 
          `${Math.ceil(validationResult.fileInfo.estimatedRows / 1000)} minutes` : '1-2 minutes',
        totalRows: data.length,
        fileInfo: validationResult.fileInfo
      };

      // Check memory status
      const memoryStatus = getMemoryStatus();
      if (memoryStatus.memoryPressure === 'high') {
        enhancedProcessingInfo.sizeWarning = 'High memory usage detected. Processing may be slower.';
      }

      setProcessingInfo(enhancedProcessingInfo);

      updateProgress(UPLOAD_ID, 'File uploaded successfully! Please select the payee column.', 60);
      
      setFileData(data);
      setFileHeaders(headers);
      setUploadState('uploaded');
      completeProgress(UPLOAD_ID, 'File uploaded successfully!');

      // Enhanced file info toast
      toast({
        title: "File Analysis Complete",
        description: `Found ${data.length.toLocaleString()} rows with ${headers.length} columns. ${validationResult.fileInfo?.hasHeaders ? 'Headers detected.' : ''} Estimated processing time: ${enhancedProcessingInfo.estimatedTime}`,
      });

    } catch (error) {
      console.error('[SMART UPLOAD] Upload failed:', error);
      setUploadState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
      setSuggestions(['Try again with a different file', 'Check your internet connection']);
      clearProgress(UPLOAD_ID);
    }
  };

  const validatePayeeColumn = async (): Promise<PayeeRowData | null> => {
    if (!fileData || !selectedPayeeColumn) return null;

    setUploadState('processing');
    updateProgress(UPLOAD_ID, 'Validating payee data...', 10);

    try {
      // Memory-aware payee validation processing
      const validationResult = await processWithMemoryManagement(
        [{ data: fileData, column: selectedPayeeColumn }],
        async (chunks) => {
          const results = [];
          for (const chunk of chunks) {
            // Extract and validate payee names
            const payeeNames = chunk.data
              .map((row: any) => {
                const value = row[chunk.column];
                return typeof value === 'string' ? value.trim() : String(value || '').trim();
              })
              .filter((name: string) => name.length > 0);

            if (payeeNames.length === 0) {
              throw new Error(`No valid payee names found in the "${chunk.column}" column. Please check your data and column selection.`);
            }

            results.push(...payeeNames);
          }
          return results;
        },
        'payee-validation'
      );

      updateProgress(UPLOAD_ID, 'Creating payee mappings and analyzing duplicates...', 30);
      const payeeRowData = createPayeeRowMapping(fileData, selectedPayeeColumn);
      
      // Update processing info with final details
      const duplicates = fileData.length - payeeRowData.uniquePayeeNames.length;
      setProcessingInfo(prev => ({
        ...prev,
        uniquePayees: payeeRowData.uniquePayeeNames.length,
        duplicates
      }));

      // Enhanced toast with detailed information
      toast({
        title: "Processing Started",
        description: `Processing ${payeeRowData.uniquePayeeNames.length} unique payees from ${fileData.length} total rows (${duplicates} duplicates found). Estimated time: ${processingInfo.estimatedTime || 'calculating...'}`,
      });

      return payeeRowData;

    } catch (error) {
      console.error('[SMART UPLOAD] Processing failed:', error);
      setUploadState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Processing failed');
      setSuggestions(['Try again', 'Check your data format']);
      clearProgress(UPLOAD_ID);
      return null;
    }
  };

  const resetUpload = () => {
    setUploadState('idle');
    setErrorMessage('');
    setSuggestions([]);
    setFileData(null);
    setFileHeaders([]);
    setSelectedPayeeColumn('');
    setFileName('');
    setProcessingInfo({});
    clearProgress(UPLOAD_ID);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return {
    uploadState,
    setUploadState,
    errorMessage,
    suggestions,
    fileData,
    fileHeaders,
    selectedPayeeColumn,
    setSelectedPayeeColumn,
    fileName,
    processingInfo,
    fileInputRef,
    handleFileSelect,
    validatePayeeColumn,
    resetUpload,
    triggerFileSelect,
    updateProgress,
    completeProgress,
    UPLOAD_ID
  };
};
