
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
import { productionLogger } from '@/lib/logging/productionLogger';

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

  // Debug logging for main component - disabled to fix performance issue
  // productionLogger.debug('Smart upload component rendering', {
  //   uploadState,
  //   hasFileData: !!fileData,
  //   fileDataLength: fileData?.length || 0,
  //   hasFileHeaders: !!fileHeaders.length,
  //   fileHeadersCount: fileHeaders.length,
  //   selectedColumn: selectedPayeeColumn,
  //   isProcessing: uploadState === 'processing'
  // }, 'SMART_UPLOAD');

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      // productionLogger.debug('No file selected', null, 'SMART_UPLOAD');
      console.log('No file selected');
      return;
    }
    // productionLogger.info('File selected for processing', { fileName: file.name, size: file.size }, 'SMART_UPLOAD');
    console.log('File selected for processing:', file.name);
    await handleFileSelect(file);
  };

  const handleColumnSelect = async () => {
    // productionLogger.debug('Column selection initiated', {
    //   selectedColumn: selectedPayeeColumn,
    //   hasFileData: !!fileData,
    //   fileDataLength: fileData?.length || 0
    // }, 'SMART_UPLOAD');
    console.log('Column selection initiated');

    if (!selectedPayeeColumn) {
      // productionLogger.error('No column selected - cannot proceed', null, 'SMART_UPLOAD');
      console.error('No column selected - cannot proceed');
      return;
    }

    if (!fileData || fileData.length === 0) {
      // productionLogger.error('No file data available - cannot proceed', null, 'SMART_UPLOAD');
      console.error('No file data available - cannot proceed');
      return;
    }

    // Validate the payee column first
    const payeeRowData = await validatePayeeColumn();
    if (!payeeRowData) {
      // productionLogger.error('Payee column validation failed', null, 'SMART_UPLOAD');
      console.error('Payee column validation failed');
      return;
    }

    // productionLogger.info('Payee column validated successfully, proceeding with batch creation', 
    //   { uniquePayees: payeeRowData.uniquePayeeNames.length }, 'SMART_UPLOAD');
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
