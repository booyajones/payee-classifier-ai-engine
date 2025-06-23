
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCheck } from 'lucide-react';
import { useUnifiedBatchManager } from '@/hooks/useUnifiedBatchManager';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { PayeeRowData } from '@/lib/rowMapping';
import { useSmartFileUpload } from '@/hooks/useSmartFileUpload';
import FileSelectionArea from './upload/FileSelectionArea';
import ColumnSelectionArea from './upload/ColumnSelectionArea';
import UploadProgressDisplay from './upload/UploadProgressDisplay';
import EnhancedUploadProgressDisplay from './upload/EnhancedUploadProgressDisplay';
import UploadErrorDisplay from './upload/UploadErrorDisplay';
import UploadSuccessDisplay from './upload/UploadSuccessDisplay';
import FileCorruptionDetector from './upload/FileCorruptionDetector';

interface SmartFileUploadProps {
  onBatchJobCreated: (batchJob: BatchJob, payeeRowData: PayeeRowData) => void;
  onProcessingComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
}

const SmartFileUpload = ({ onBatchJobCreated, onProcessingComplete }: SmartFileUploadProps) => {
  const { createBatch } = useUnifiedBatchManager();
  
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
      const jobDescription = `Upload: ${fileName} (${payeeRowData.uniquePayeeNames.length} unique payees)`;

      const job = await createBatch(payeeRowData, {
        description: jobDescription,
        onJobUpdate: (updatedJob) => {
          console.log(`[SMART UPLOAD] Job ${updatedJob.id} updated: ${updatedJob.status}`);
          updateProgress(
            UPLOAD_ID, 
            `Job status: ${updatedJob.status}`, 
            75, 
            updatedJob.status, 
            updatedJob.id
          );
        },
        onJobComplete: (results, summary, jobId) => {
          console.log(`[SMART UPLOAD] Job ${jobId} completed with ${results.length} results`);
          setUploadState('complete');
          completeProgress(UPLOAD_ID, `Successfully processed ${results.length} payees!`);
          onProcessingComplete(results, summary, jobId);
        }
      });

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
          Supports files up to 100MB with intelligent processing for large files.
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
          <EnhancedUploadProgressDisplay
            uploadState={uploadState}
            uploadId={UPLOAD_ID}
            showMemoryStats={true}
            showProgressHistory={false}
          />
        )}

        {uploadState === 'complete' && (
          <UploadSuccessDisplay
            uploadId={UPLOAD_ID}
            onReset={resetUpload}
            resultCount={processingInfo.uniquePayees}
          />
        )}

        {uploadState === 'error' && (
          <UploadErrorDisplay
            error={errorMessage}
            onRetry={resetUpload}
            context="File Upload"
          />
        )}
      </CardContent>
    </Card>
  );
};

export default SmartFileUpload;
