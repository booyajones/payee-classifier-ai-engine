
import { Card, CardContent } from '@/components/ui/card';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { PayeeRowData } from '@/lib/rowMapping';
import { useSmartFileUpload } from '@/hooks/useSmartFileUpload';
import { useEnhancedNotifications } from '@/components/ui/enhanced-notifications';

import SmartFileUploadHeader from './upload/SmartFileUploadHeader';
import SmartFileUploadContent from './upload/SmartFileUploadContent';
import SmartFileUploadStatusDisplay from './upload/SmartFileUploadStatusDisplay';


interface SmartFileUploadProps {
  onBatchJobCreated: (batchJob: BatchJob | null, payeeRowData: PayeeRowData) => void;
  onProcessingComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
}

const SmartFileUpload = ({ onBatchJobCreated, onProcessingComplete }: SmartFileUploadProps) => {
  const hasError = () => false; // Simplified for now
  const { showSuccess, showError, showLoading } = useEnhancedNotifications();
  
  const {
    uploadState,
    setUploadState,
    errorMessage,
    setErrorMessage,
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
  } = useSmartFileUpload();

  // Core batch job creation handler
  const coreHandleColumnSelect = async (payeeRowData: PayeeRowData) => {
    console.log('Creating batch job with payee data:', payeeRowData.uniquePayeeNames.length);
    
    try {
      setUploadState('processing');
      const dismissLoading = showLoading('Creating Batch Job', 'Processing your file...');
      
      updateProgress(UPLOAD_ID, 'Creating batch job...', 70);
      
      // Import createBatchJob and generateContextualBatchJobName
      const { createBatchJob } = await import('@/lib/openai/trueBatchAPI');
      const { generateContextualBatchJobName } = await import('@/lib/services/batchJobNameGenerator');
      
      // Generate job name and create actual batch job
      const jobName = generateContextualBatchJobName(payeeRowData.uniquePayeeNames.length, 'file');
      const batchJob = await createBatchJob(
        payeeRowData.uniquePayeeNames,
        `File upload batch: ${payeeRowData.uniquePayeeNames.length} payees`,
        jobName
      );
      
      console.log('Batch job created successfully:', batchJob.id);
      
      // Create the batch job via callback with actual batch job
      onBatchJobCreated(batchJob, payeeRowData);
      
      updateProgress(UPLOAD_ID, 'Batch job created successfully!', 100);
      completeProgress(UPLOAD_ID, 'Ready for processing!');
      setUploadState('complete');
      
      dismissLoading();
      showSuccess(
        'File Uploaded Successfully!', 
        `${payeeRowData.uniquePayeeNames.length} unique payees ready for processing`
      );
      
    } catch (error) {
      console.error('Failed to create batch job:', error);
      setUploadState('error');
      const errorMsg = error instanceof Error ? error.message : 'Failed to create batch job';
      setErrorMessage(errorMsg);
      
      showError(
        'Upload Failed',
        errorMsg,
        {
          retry: () => coreHandleColumnSelect(payeeRowData),
          retryLabel: 'Try Again'
        }
      );
    }
  };

  // Debug logging for main component
  console.log('Smart upload rendering:', { uploadState, hasFileData: !!fileData });

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }
    console.log('File selected for processing:', file.name);
    await handleFileSelect(file);
  };

  const handleColumnSelect = async () => {
    console.log('Column selection initiated');

    if (!selectedPayeeColumn) {
      console.error('No column selected - cannot proceed');
      return;
    }

    if (!fileData || fileData.length === 0) {
      console.error('No file data available - cannot proceed');
      return;
    }

    // Validate the payee column first
    const payeeRowData = await validatePayeeColumn();
    if (!payeeRowData) {
      console.error('Payee column validation failed');
      return;
    }

    console.log('Payee column validated successfully, proceeding with batch creation');
    await coreHandleColumnSelect(payeeRowData);
  };

  const isProcessing = uploadState === 'processing';
  const hasGlobalError = false;

  return (
    <Card>
      <SmartFileUploadHeader hasGlobalError={hasGlobalError} />
      
      <CardContent className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileInputChange}
          disabled={isProcessing}
        />

        <SmartFileUploadStatusDisplay 
          hasGlobalError={hasGlobalError}
          isProcessing={isProcessing}
          fileData={fileData}
        />

        <SmartFileUploadContent
          uploadState={uploadState}
          isProcessing={isProcessing}
          fileData={fileData}
          fileHeaders={fileHeaders}
          selectedPayeeColumn={selectedPayeeColumn}
          setSelectedPayeeColumn={setSelectedPayeeColumn}
          processingInfo={processingInfo}
          errorMessage={errorMessage}
          triggerFileSelect={triggerFileSelect}
          handleColumnSelect={handleColumnSelect}
          resetUpload={resetUpload}
          UPLOAD_ID={UPLOAD_ID}
        />
      </CardContent>
    </Card>
  );
};

export default SmartFileUpload;
