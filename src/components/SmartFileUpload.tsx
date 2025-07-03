
import { Card, CardContent } from '@/components/ui/card';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { PayeeRowData } from '@/lib/rowMapping';
import { useSmartFileUpload } from '@/hooks/useSmartFileUpload';

import SmartFileUploadHeader from './upload/SmartFileUploadHeader';
import SmartFileUploadContent from './upload/SmartFileUploadContent';
import SmartFileUploadStatusDisplay from './upload/SmartFileUploadStatusDisplay';


interface SmartFileUploadProps {
  onBatchJobCreated: (batchJob: BatchJob | null, payeeRowData: PayeeRowData) => void;
  onProcessingComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
}

const SmartFileUpload = ({ onBatchJobCreated, onProcessingComplete }: SmartFileUploadProps) => {
  const hasError = () => false; // Simplified for now
  
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
    productionLogger.debug('Creating batch job with payee data:', payeeRowData.uniquePayeeNames.length);
    
    try {
      setUploadState('processing');
      updateProgress(UPLOAD_ID, 'Creating batch job...', 70);
      
      // Create the batch job via callback
      onBatchJobCreated(null, payeeRowData);
      
      updateProgress(UPLOAD_ID, 'Batch job created successfully!', 100);
      completeProgress(UPLOAD_ID, 'Ready for processing!');
      setUploadState('complete');
      
    } catch (error) {
      productionLogger.error('Failed to create batch job:', error);
      setUploadState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create batch job');
    }
  };

  // Debug logging for main component
  productionLogger.debug('Smart upload rendering:', { uploadState, hasFileData: !!fileData });

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      productionLogger.debug('No file selected');
      return;
    }
    productionLogger.debug('File selected for processing:', file.name);
    await handleFileSelect(file);
  };

  const handleColumnSelect = async () => {
    productionLogger.debug('Column selection initiated');

    if (!selectedPayeeColumn) {
      productionLogger.error('No column selected - cannot proceed');
      return;
    }

    if (!fileData || fileData.length === 0) {
      productionLogger.error('No file data available - cannot proceed');
      return;
    }

    // Validate the payee column first
    const payeeRowData = await validatePayeeColumn();
    if (!payeeRowData) {
      productionLogger.error('Payee column validation failed');
      return;
    }

    productionLogger.debug('Payee column validated successfully, proceeding with batch creation');
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
