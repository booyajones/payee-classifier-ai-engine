
import { useState, useRef } from 'react';
import { parseUploadedFile } from '@/lib/utils';
import { createPayeeRowMapping, PayeeRowData } from '@/lib/rowMapping';
import { useUnifiedProgress } from '@/contexts/UnifiedProgressContext';
import { useEnhancedFileValidation } from './useEnhancedFileValidation';

import { useToast } from '@/hooks/use-toast';

export type UploadState = 'idle' | 'uploaded' | 'processing' | 'complete' | 'error';

export interface FileProcessingInfo {
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
  const { toast } = useToast();

  const UPLOAD_ID = 'file-upload';

  // Debug logging utility
  const debugLog = (message: string, data?: any) => {
    console.log(`[SMART UPLOAD DEBUG] ${message}`, data || '');
  };

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
    debugLog(`Starting file selection process for: ${file.name}`, {
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified)
    });
    
    setUploadState('processing');
    updateProgress(UPLOAD_ID, 'Analyzing file structure...', 10);
    setErrorMessage('');
    setSuggestions([]);
    setFileName(file.name);
    setProcessingInfo({});
    setFileData(null);
    setFileHeaders([]);
    setSelectedPayeeColumn('');

    try {
      debugLog('Beginning file validation');
      
      // Use enhanced file validation
      const validationResult = await validateFile(file, {
        maxFileSize: 100 * 1024 * 1024, // 100MB
        allowedTypes: ['.xlsx', '.xls', '.csv'],
        requireHeaders: true,
        minRows: 1,
        maxRows: 100000
      });

      debugLog('Validation result:', {
        isValid: validationResult.isValid,
        hasWarnings: !!validationResult.warnings,
        warningCount: validationResult.warnings?.length || 0,
        hasError: !!validationResult.error
      });

      if (!validationResult.isValid) {
        debugLog('File validation failed', validationResult.error);
        setUploadState('error');
        setErrorMessage(validationResult.error!.message);
        setSuggestions(getSuggestions(validationResult.error!.code));
        clearProgress(UPLOAD_ID);
        return;
      }

      // Show warnings if any (but convert to info toasts, not error toasts)
      if (validationResult.warnings && validationResult.warnings.length > 0) {
        debugLog(`File has ${validationResult.warnings.length} warnings`, validationResult.warnings);
        
        validationResult.warnings.forEach((warning, index) => {
          // Use regular toast (not error variant) for warnings
          toast({
            title: "File Analysis Note",
            description: warning,
            duration: 3000,
          });
        });
      }

      updateProgress(UPLOAD_ID, 'Reading file contents...', 30);

      debugLog('Starting memory-aware file processing');

      // Direct file processing without memory management
      const data = await parseUploadedFile(file);

      debugLog('File parsing completed', {
        rowsFound: data?.length || 0
      });

      if (!data || data.length === 0) {
        debugLog('No data found in file');
        setUploadState('error');
        setErrorMessage('No data found in the file. Please check if the file has content.');
        setSuggestions(['Ensure the file has data rows', 'Try a different file format']);
        clearProgress(UPLOAD_ID);
        return;
      }

      const headers = Object.keys(data[0]);
      if (headers.length === 0) {
        debugLog('No columns found in file');
        setUploadState('error');
        setErrorMessage('No columns found in the file.');
        setSuggestions(['Ensure the file has a header row', 'Try a different file format']);
        clearProgress(UPLOAD_ID);
        return;
      }

      debugLog('File processing successful', {
        totalRows: data.length,
        columnCount: headers.length,
        columns: headers.slice(0, 5) // First 5 columns for debugging
      });

      // Enhanced processing info with file validation details
      const enhancedProcessingInfo: FileProcessingInfo = {
        totalRows: data.length,
        fileInfo: validationResult.fileInfo
      };


      setProcessingInfo(enhancedProcessingInfo);

      updateProgress(UPLOAD_ID, 'File uploaded successfully! Please select the payee column.', 60);
      
      setFileData(data);
      setFileHeaders(headers);
      
      // CRITICAL FIX: Set state to 'uploaded' and wait for user column selection
      debugLog('Setting upload state to uploaded - COLUMN SELECTION REQUIRED');
      setUploadState('uploaded');
      completeProgress(UPLOAD_ID, 'File uploaded successfully! Please select the payee column.');

      // Enhanced file info toast (success, not error)
      toast({
        title: "File Analysis Complete",
        description: `Found ${data.length.toLocaleString()} rows with ${headers.length} columns. ${validationResult.fileInfo?.hasHeaders ? 'Headers detected.' : ''}`,
      });

      debugLog('File upload process completed successfully - awaiting column selection');

    } catch (error) {
      debugLog('Upload failed with error', error);
      setUploadState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
      setSuggestions(['Try again with a different file', 'Check your internet connection']);
      clearProgress(UPLOAD_ID);
    }
  };

  const validatePayeeColumn = async (): Promise<PayeeRowData | null> => {
    debugLog('Starting payee column validation', {
      selectedColumn: selectedPayeeColumn,
      hasFileData: !!fileData,
      fileDataLength: fileData?.length || 0
    });

    if (!fileData || !selectedPayeeColumn) {
      debugLog('Missing file data or selected column', {
        hasFileData: !!fileData,
        selectedColumn: selectedPayeeColumn
      });
      return null;
    }

    // IMPORTANT: Don't change uploadState here - let the caller handle it
    updateProgress(UPLOAD_ID, 'Validating payee data...', 10);

    try {
      // Direct payee validation processing
      const payeeNames = fileData
        .map((row: any) => {
          const value = row[selectedPayeeColumn];
          return typeof value === 'string' ? value.trim() : String(value || '').trim();
        })
        .filter((name: string) => name.length > 0);

      if (payeeNames.length === 0) {
        throw new Error(`No valid payee names found in the "${selectedPayeeColumn}" column. Please check your data and column selection.`);
      }

      updateProgress(UPLOAD_ID, 'Creating payee mappings and analyzing duplicates...', 30);
      const payeeRowData = createPayeeRowMapping(fileData, selectedPayeeColumn);
      
      // Update processing info with final details
      const duplicates = fileData.length - payeeRowData.uniquePayeeNames.length;
      setProcessingInfo(prev => ({
        ...prev,
        uniquePayees: payeeRowData.uniquePayeeNames.length,
        duplicates
      }));

      debugLog('Payee validation completed successfully', {
        uniquePayees: payeeRowData.uniquePayeeNames.length,
        totalRows: fileData.length,
        duplicates
      });

      // Enhanced toast with detailed information
      toast({
        title: "Column Validation Complete",
        description: `Found ${payeeRowData.uniquePayeeNames.length} unique payees from ${fileData.length} total rows (${duplicates} duplicates detected).`,
      });

      return payeeRowData;

    } catch (error) {
      debugLog('Payee validation failed', error);
      setUploadState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Processing failed');
      setSuggestions(['Try again', 'Check your data format']);
      clearProgress(UPLOAD_ID);
      return null;
    }
  };

  const resetUpload = () => {
    debugLog('Resetting upload state');
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
    debugLog('Triggering file selection dialog');
    fileInputRef.current?.click();
  };

  return {
    uploadState,
    setUploadState,
    errorMessage,
    setErrorMessage,
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
