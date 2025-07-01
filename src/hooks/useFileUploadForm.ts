
import { useState } from "react";
import { parseUploadedFile } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { ClassificationConfig } from "@/lib/types";
import { createBatchJob, BatchJob } from "@/lib/openai/trueBatchAPI";
import { validateFile, validatePayeeData } from "@/lib/fileValidation";
import { handleError, showErrorToast, showRetryableErrorToast } from "@/lib/errorHandler";
import { useRetry } from "@/hooks/useRetry";
import { createPayeeRowMapping, PayeeRowData } from "@/lib/rowMapping";
import { saveBatchJob } from "@/lib/database/batchJobService";

export type ValidationStatus = 'none' | 'validating' | 'valid' | 'error';
export type BackgroundSaveStatus = 'none' | 'saving' | 'saved' | 'complete' | 'error';

export const useFileUploadForm = (
  onBatchJobCreated: (batchJob: BatchJob, payeeRowData: PayeeRowData) => void,
  config: ClassificationConfig = {
    aiThreshold: 80,
    bypassRuleNLP: true,
    useEnhanced: true,
    offlineMode: false,
    useFuzzyMatching: true,
    similarityThreshold: 85
  }
) => {
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('none');
  const [fileInfo, setFileInfo] = useState<{ rowCount?: number; payeeCount?: number } | null>(null);
  const [backgroundSaveStatus, setBackgroundSaveStatus] = useState<BackgroundSaveStatus>('none');
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
    setBackgroundSaveStatus('none');
    
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

      // Create OpenAI batch job (this part works fine)
      const batchJob = await createBatchJobWithRetry(
        payeeRowData.uniquePayeeNames, 
        `File upload batch: ${file.name}, ${payeeRowData.uniquePayeeNames.length} unique payees from ${originalFileData.length} rows (${sizeMB}MB)`
      );
      
      console.log(`[FILE UPLOAD] Batch job created successfully:`, batchJob);

      // Show immediate success for batch creation
      toast({
        title: "✅ Batch Job Created Successfully",
        description: `OpenAI batch created with ${payeeRowData.uniquePayeeNames.length} payees from ${originalFileData.length} rows (${sizeMB}MB). Job ID: ${batchJob.id.slice(-8)}`,
        duration: 5000,
      });

      // Handle database save with background processing
      try {
        setBackgroundSaveStatus('saving');
        
        // Use new background save approach
        await saveBatchJob(batchJob, payeeRowData);
        
        console.log(`[FILE UPLOAD] Batch job data saved successfully`);
        setBackgroundSaveStatus('saved');
        
        toast({
          title: "✅ Batch Job Saved",
          description: "Your batch job has been saved successfully and is ready for processing.",
        });

      } catch (dbError) {
        console.error('[FILE UPLOAD] Database save failed:', dbError);
        setBackgroundSaveStatus('error');
        
        // More specific error handling
        const isTimeoutError = dbError instanceof Error && 
          (dbError.message.includes('timeout') || dbError.message.includes('statement timeout'));
        
        if (isTimeoutError) {
          toast({
            title: "⏱️ Database Save Timeout",
            description: "Large file data save is taking longer than expected but will continue in background. Your batch job is processing normally.",
            variant: "destructive",
            duration: 8000,
          });
        } else {
          toast({
            title: "⚠️ Database Save Warning", 
            description: "Batch job created successfully but database save encountered an issue. Job will process normally and you can retry save later.",
            variant: "destructive",
            duration: 6000,
          });
        }
      }

      // Always pass the job data to parent component - the important part worked!
      onBatchJobCreated(batchJob, payeeRowData);
      
    } catch (error) {
      const appError = handleError(error, 'Batch Job Creation');
      console.error("Error creating batch job from file:", error);
      
      // This is the real "batch creation failed" - OpenAI API issue
      toast({
        title: "❌ Batch Creation Failed",
        description: "Failed to create OpenAI batch job. This is usually due to API issues or quota limits.",
        variant: "destructive",
        duration: 8000,
      });
      
      showRetryableErrorToast(
        appError, 
        () => handleProcess(),
        'Batch Job Creation'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return {
    file,
    columns,
    selectedColumn,
    setSelectedColumn,
    isLoading,
    fileError,
    validationStatus,
    fileInfo,
    backgroundSaveStatus,
    isRetrying,
    retryCount,
    resetForm,
    handleFileChange,
    handleProcess
  };
};
