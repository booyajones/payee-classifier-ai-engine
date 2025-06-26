import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCheck } from 'lucide-react';
import { useBatchManager, emitBatchJobUpdate } from '@/hooks/useBatchManager';
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
import { Badge } from '@/components/ui/badge';
import PerformanceMonitoringDashboard from './performance/PerformanceMonitoringDashboard';
import { Loader2, Database } from 'lucide-react';

interface SmartFileUploadProps {
  onBatchJobCreated: (batchJob: BatchJob | null, payeeRowData: PayeeRowData) => void;
  onProcessingComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
}

const SmartFileUpload = ({ onBatchJobCreated, onProcessingComplete }: SmartFileUploadProps) => {
  const { createBatch } = useBatchManager();
  
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

    updateProgress(UPLOAD_ID, 'Creating OpenAI batch job...', 30);

    try {
      const jobDescription = `Smart Upload: ${fileName} (${payeeRowData.uniquePayeeNames.length} unique payees)`;

      // Create batch job (OpenAI part)
      const job = await createBatch(payeeRowData, {
        description: jobDescription,
        onJobUpdate: (updatedJob) => {
          console.log(`[SMART UPLOAD] Job ${updatedJob.id} updated: ${updatedJob.status}`);
          updateProgress(
            UPLOAD_ID, 
            `Batch processing: ${updatedJob.status}`, 
            60, 
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
        // OpenAI batch created successfully
        updateProgress(UPLOAD_ID, 'Batch job created! Optimizing data storage...', 70);
        
        // Notify parent immediately - the important part (OpenAI batch) worked
        console.log(`[SMART UPLOAD] OpenAI batch created successfully: ${job.id}`);
        onBatchJobCreated(job, payeeRowData);

        // Emit batch job update to refresh UI
        emitBatchJobUpdate();

        setUploadState('processing');
        updateProgress(UPLOAD_ID, 'OpenAI batch processing started! Background data optimization in progress...', 80, 'Batch processing active', job.id);

      } else {
        // Local processing (large files)
        console.log(`[SMART UPLOAD] Using local processing for large file`);
        onBatchJobCreated(null, payeeRowData);
        
        setUploadState('complete');
        completeProgress(UPLOAD_ID, 'Processing completed using enhanced local classification!');
      }

    } catch (error) {
      console.error('[SMART UPLOAD] Processing failed:', error);
      setUploadState('error');
      
      // Better error messaging
      const isOpenAIError = error instanceof Error && 
        (error.message.includes('OpenAI') || error.message.includes('API') || error.message.includes('quota'));
      
      if (isOpenAIError) {
        updateProgress(UPLOAD_ID, '❌ OpenAI Batch Creation Failed', 0, 'OpenAI API error - check quota and API key');
      } else {
        updateProgress(UPLOAD_ID, '❌ Processing Failed', 0, error instanceof Error ? error.message : 'Unknown processing error');
      }
    }
  };

  const isProcessing = uploadState === 'processing';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          Smart File Upload & Classification
          <Badge variant="outline" className="ml-auto">
            Enhanced Performance
          </Badge>
        </CardTitle>
        <CardDescription>
          Upload your payee file and select the column containing payee names. 
          Enhanced with instant OpenAI batch creation, intelligent background data optimization, and streaming processing for files up to 500MB.
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
          <>
            <EnhancedUploadProgressDisplay
              uploadState={uploadState}
              uploadId={UPLOAD_ID}
              showMemoryStats={true}
              showProgressHistory={false}
            />
            
            {/* Performance monitoring for large files */}
            {(fileData?.length || 0) > 10000 && (
              <div className="mt-4">
                <PerformanceMonitoringDashboard 
                  isVisible={true}
                  compact={true}
                />
              </div>
            )}

            {/* Enhanced processing info */}
            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
              <div className="flex items-center gap-1 mb-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Enhanced Processing Active
              </div>
              <p>✓ OpenAI batch job created and processing</p>
              <p>✓ Background data optimization in progress</p>
              <p>✓ You can continue working - processing happens in background</p>
            </div>
          </>
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
            context="Smart File Upload"
          />
        )}

        {/* Enhanced optimization info */}
        <div className="text-xs text-muted-foreground bg-green-50 p-2 rounded border border-green-200">
          <div className="flex items-center gap-1 text-green-700 font-medium mb-1">
            <Database className="h-3 w-3" />
            Smart Processing Enhancements
          </div>
          <p>🚀 Instant OpenAI batch creation (no waiting for data saves)</p>
          <p>📊 Background data optimization with intelligent chunking</p>
          <p>🔧 Automatic error recovery and retry mechanisms</p>
          <p>⚡ Real-time progress tracking and status updates</p>
          <p>🎯 Separation of batch processing from data storage concerns</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartFileUpload;
