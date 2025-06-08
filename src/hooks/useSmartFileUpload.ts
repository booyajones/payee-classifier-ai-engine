
import { useState, useRef } from 'react';
import { parseUploadedFile } from '@/lib/utils';
import { validateFile, validatePayeeData } from '@/lib/fileValidation';
import { createPayeeRowMapping, PayeeRowData } from '@/lib/rowMapping';
import { useUnifiedProgress } from '@/contexts/UnifiedProgressContext';
import { useToast } from '@/hooks/use-toast';

export type UploadState = 'idle' | 'uploaded' | 'processing' | 'complete' | 'error';

export const useSmartFileUpload = () => {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [fileData, setFileData] = useState<any[] | null>(null);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [selectedPayeeColumn, setSelectedPayeeColumn] = useState<string>('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { updateProgress, completeProgress, clearProgress } = useUnifiedProgress();
  const { toast } = useToast();

  const UPLOAD_ID = 'file-upload';

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

  const handleFileSelect = async (file: File) => {
    setUploadState('processing');
    updateProgress(UPLOAD_ID, 'Analyzing file structure...', 10);
    setErrorMessage('');
    setSuggestions([]);
    setFileName(file.name);

    try {
      const fileValidation = validateFile(file);
      if (!fileValidation.isValid) {
        setUploadState('error');
        setErrorMessage(fileValidation.error!.message);
        setSuggestions(getSuggestions(fileValidation.error!.code));
        clearProgress(UPLOAD_ID);
        return;
      }

      updateProgress(UPLOAD_ID, 'Reading file contents...', 30);

      const data = await parseUploadedFile(file);
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

  const validatePayeeColumn = async (): Promise<PayeeRowData | null> => {
    if (!fileData || !selectedPayeeColumn) return null;

    setUploadState('processing');
    updateProgress(UPLOAD_ID, 'Validating payee data...', 10);

    try {
      const dataValidation = validatePayeeData(fileData, selectedPayeeColumn);
      if (!dataValidation.isValid) {
        setUploadState('error');
        setErrorMessage(dataValidation.error!.message);
        setSuggestions(getSuggestions(dataValidation.error!.code));
        clearProgress(UPLOAD_ID);
        return null;
      }

      updateProgress(UPLOAD_ID, 'Creating payee mappings...', 30);
      const payeeRowData = createPayeeRowMapping(fileData, selectedPayeeColumn);
      
      toast({
        title: "Processing Started",
        description: `Processing ${payeeRowData.uniquePayeeNames.length} unique payees from ${fileName}.`,
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
