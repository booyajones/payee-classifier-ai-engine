
import { Card, CardContent } from '@/components/ui/card';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { PayeeRowData } from '@/lib/rowMapping';
import { useSmartFileUpload } from '@/hooks/useSmartFileUpload';
import { useBatchManager } from '@/hooks/useBatchManager';
import SmartFileUploadHeader from './upload/SmartFileUploadHeader';
import SmartFileUploadContent from './upload/SmartFileUploadContent';
import SmartFileUploadStatusDisplay from './upload/SmartFileUploadStatusDisplay';
import { useSmartFileUploadCore } from './upload/SmartFileUploadCore';

interface SmartFileUploadProps {
  onBatchJobCreated: (batchJob: BatchJob | null, payeeRowData: PayeeRowData) => void;
  onProcessingComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
}

const SmartFileUpload = ({ onBatchJobCreated, onProcessingComplete }: SmartFileUploadProps) => {
  const { hasError } = useBatchManager();
  
  const {
    uploadState,
    setUploadState,
    errorMessage,
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

  const { handleColumnSelect: coreHandleColumnSelect } = useSmartFileUploadCore({
    onBatchJobCreated,
    onProcessingComplete,
    fileName,
    updateProgress,
    completeProgress,
    UPLOAD_ID,
    setUploadState
  });

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
    await coreHandleColumnSelect(payeeRowData, validatePayeeColumn);
  };

  const isProcessing = uploadState === 'processing';
  const hasGlobalError = hasError('');

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
