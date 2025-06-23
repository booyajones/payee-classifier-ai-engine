import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCheck } from 'lucide-react';
import { useSmartBatchManager } from '@/hooks/useSmartBatchManager';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { PayeeRowData } from '@/lib/rowMapping';
import { useSmartFileUpload } from '@/hooks/useSmartFileUpload';
import FileSelectionArea from './upload/FileSelectionArea';
import ColumnSelectionArea from './upload/ColumnSelectionArea';
import UploadProgressDisplay from './upload/UploadProgressDisplay';
import UploadErrorDisplay from './upload/UploadErrorDisplay';
import UploadSuccessDisplay from './upload/UploadSuccessDisplay';

interface SmartFileUploadProps {
  onBatchJobCreated: (batchJob: BatchJob, payeeRowData: PayeeRowData) => void;
  onProcessingComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
}

const SmartFileUpload = ({ onBatchJobCreated, onProcessingComplete }: SmartFileUploadProps) => {
  const { createSmartBatchJob, getSmartState } = useSmartBatchManager();
  
  const {
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
  } = useSmartFileUpload();

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFileSelect(file);
  };

  const handleColumnSelect = async () => {
    const payeeRowData = await validatePayeeColumn();
    if (!payeeRowData) return;

    updateProgress(UPLOAD_ID, 'Creating batch job...', 50);

    try {
      const job = await createSmartBatchJob(
        payeeRowData,
        `Upload: ${fileName} (${payeeRowData.uniquePayeeNames.length} unique payees)`,
        (updatedJob) => {
          console.log(`[SMART UPLOAD] Job ${updatedJob.id} updated: ${updatedJob.status}`);
          const smartState = getSmartState(updatedJob.id);
          updateProgress(UPLOAD_ID, smartState.currentStage, smartState.progress, smartState.currentStage, updatedJob.id);
        },
        (results, summary, jobId) => {
          console.log(`[SMART UPLOAD] Job ${jobId} completed with ${results.length} results`);
          setUploadState('complete');
          completeProgress(UPLOAD_ID, `Successfully processed ${results.length} payees!`);
          onProcessingComplete(results, summary, jobId);
        }
      );

      if (job) {
        setUploadState('processing');
        updateProgress(UPLOAD_ID, 'Batch job created! Processing payee classifications...', 70, 'OpenAI batch processing started', job.id);
        onBatchJobCreated(job, payeeRowData);
      } else {
        setUploadState('complete');
        completeProgress(UPLOAD_ID, 'Processing completed using enhanced local classification!');
      }

    } catch (error) {
      console.error('[SMART UPLOAD] Processing failed:', error);
      setUploadState('error');
      updateProgress(UPLOAD_ID, 'Processing failed', 0, error instanceof Error ? error.message : 'Processing failed');
    }
  };

  const isProcessing = uploadState === 'processing';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          File Upload & Classification
        </CardTitle>
        <CardDescription>
          Upload your payee file and select the column containing payee names. 
          Supports files up to 100MB with 100,000 rows.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileInputChange}
          disabled={isProcessing}
        />

        {uploadState === 'idle' && (
          <FileSelectionArea 
            onFileSelect={triggerFileSelect}
            disabled={isProcessing}
          />
        )}

        {uploadState === 'uploaded' && (
          <ColumnSelectionArea
            fileHeaders={fileHeaders}
            selectedColumn={selectedPayeeColumn}
            onColumnChange={setSelectedPayeeColumn}
            onProcess={handleColumnSelect}
            onCancel={resetUpload}
            recordCount={fileData?.length || 0}
            processingInfo={processingInfo}
            disabled={isProcessing}
          />
        )}

        {isProcessing && (
          <UploadProgressDisplay
            uploadState={uploadState}
            uploadId={UPLOAD_ID}
          />
        )}

        {uploadState === 'complete' && (
          <UploadSuccessDisplay
            uploadId={UPLOAD_ID}
            onReset={resetUpload}
          />
        )}

        {uploadState === 'error' && (
          <UploadErrorDisplay
            errorMessage={errorMessage}
            suggestions={suggestions}
            onRetry={resetUpload}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default SmartFileUpload;
