import { useState, useRef } from 'react';
import { parseUploadedFile } from '@/lib/utils';
import { createPayeeRowMapping } from '@/lib/rowMapping';
import { useUnifiedProgress } from '@/contexts/UnifiedProgressContext';
import { useEnhancedFileValidation } from './useEnhancedFileValidation';
import { useToast } from '@/hooks/use-toast';

export const useSmartFileUpload = () => {
  const [uploadState, setUploadState] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [fileData, setFileData] = useState(null);
  const [fileHeaders, setFileHeaders] = useState([]);
  const [selectedPayeeColumn, setSelectedPayeeColumn] = useState('');
  const [fileName, setFileName] = useState('');
  const [processingInfo, setProcessingInfo] = useState({});
  const fileInputRef = useRef(null);

  const { updateProgress, completeProgress, clearProgress } = useUnifiedProgress();
  const { validateFile } = useEnhancedFileValidation();
  const { toast } = useToast();

  const UPLOAD_ID = 'file-upload';

  const debugLog = (message, data) => {
    productionLogger.debug(`[SMART UPLOAD DEBUG] ${message}`, data || '');
  };

  const resetState = () => {
    setUploadState('idle');
    setErrorMessage('');
    setSuggestions([]);
    setFileData(null);
    setFileHeaders([]);
    setSelectedPayeeColumn('');
    setFileName('');
    setProcessingInfo({});
    clearProgress(UPLOAD_ID);
  };

  const handleFileUpload = async (file) => {
    try {
      debugLog('Starting file upload', { name: file.name, size: file.size });
      
      setUploadState('uploaded');
      setFileName(file.name);
      clearProgress(UPLOAD_ID);
      
      updateProgress(UPLOAD_ID, 10, 'Validating file structure...');
      
      const validation = await validateFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error || 'File validation failed');
      }

      updateProgress(UPLOAD_ID, 30, 'Reading file content...');
      
      const { data, headers } = await parseUploadedFile(file);
      
      if (!data || data.length === 0) {
        throw new Error('File appears to be empty or could not be read');
      }

      updateProgress(UPLOAD_ID, 60, 'Processing data structure...');
      
      setFileData(data);
      setFileHeaders(headers);
      
      const payeeColumnSuggestions = headers.filter(header =>
        header && /payee|vendor|supplier|company|name|recipient/i.test(header)
      );
      
      setSuggestions(payeeColumnSuggestions);
      
      if (payeeColumnSuggestions.length === 1) {
        setSelectedPayeeColumn(payeeColumnSuggestions[0]);
      }

      updateProgress(UPLOAD_ID, 90, 'Finalizing upload...');
      
      const fileInfo = {
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified),
        estimatedRows: data.length,
        columns: headers
      };

      setProcessingInfo({
        totalRows: data.length,
        fileInfo
      });

      completeProgress(UPLOAD_ID, 'File uploaded successfully');
      setUploadState('complete');
      
      debugLog('File upload completed successfully', {
        rows: data.length,
        headers: headers.length,
        suggestions: payeeColumnSuggestions.length
      });

    } catch (error) {
      productionLogger.error('[SMART UPLOAD] Upload failed:', error);
      setErrorMessage(error.message || 'Failed to upload file');
      setUploadState('error');
      clearProgress(UPLOAD_ID);
    }
  };

  const handleColumnSelect = async (column) => {
    try {
      debugLog('Column selected', { column });
      
      if (!fileData || !column) {
        throw new Error('Missing file data or column selection');
      }

      setSelectedPayeeColumn(column);
      setUploadState('processing');
      
      updateProgress(UPLOAD_ID, 20, 'Analyzing payee data...');
      
      const payeeRowData = await createPayeeRowMapping(
        fileData,
        column,
        (progress, message) => updateProgress(UPLOAD_ID, progress, message),
        fileHeaders
      );

      updateProgress(UPLOAD_ID, 80, 'Completing analysis...');

      const uniquePayees = new Set(
        payeeRowData.rowMappings
          .map(mapping => mapping.payeeName)
          .filter(name => name && name.trim())
      ).size;

      setProcessingInfo(prev => ({
        ...prev,
        uniquePayees,
        duplicates: payeeRowData.rowMappings.length - uniquePayees
      }));

      completeProgress(UPLOAD_ID, `Analysis complete: ${uniquePayees} unique payees found`);
      setUploadState('complete');
      
      debugLog('Column selection completed', {
        totalMappings: payeeRowData.rowMappings.length,
        uniquePayees
      });

      return payeeRowData;

    } catch (error) {
      productionLogger.error('[SMART UPLOAD] Column selection failed:', error);
      setErrorMessage(error.message || 'Failed to process selected column');
      setUploadState('error');
      clearProgress(UPLOAD_ID);
      throw error;
    }
  };

  const canProceed = uploadState === 'complete' && 
                     selectedPayeeColumn && 
                     fileData && 
                     fileData.length > 0;

  return {
    uploadState,
    errorMessage,
    suggestions,
    fileData,
    fileHeaders,
    selectedPayeeColumn,
    fileName,
    processingInfo,
    fileInputRef,
    canProceed,
    handleFileUpload,
    handleColumnSelect,
    setSelectedPayeeColumn,
    resetState,
    debugLog
  };
};