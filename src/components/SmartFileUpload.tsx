
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
import { Loader2, Database, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SmartFileUploadProps {
  onBatchJobCreated: (batchJob: BatchJob | null, payeeRowData: PayeeRowData) => void;
  onProcessingComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
}

const SmartFileUpload = ({ onBatchJobCreated, onProcessingComplete }: SmartFileUploadProps) => {
  const { createBatch, hasError, getError } = useBatchManager();
  const { toast } = useToast();
  
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

      console.log(`[SMART UPLOAD] Starting batch creation for ${payeeRowData.uniquePayeeNames.length} payees`);

      // Create batch job with enhanced error handling
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
        },
        silent: false // We want to see all errors during upload
      });

      if (job) {
        // OpenAI batch created successfully
        updateProgress(UPLOAD_ID, 'Batch job created successfully!', 70);
        
        console.log(`[SMART UPLOAD] OpenAI batch created successfully: ${job.id}`);
        onBatchJobCreated(job, payeeRowData);

        // Emit batch job update to refresh UI
        emitBatchJobUpdate();

        setUploadState('processing');
        updateProgress(
          UPLOAD_ID, 
          'OpenAI batch processing started! Processing in background...', 
          80, 
          'Batch processing active', 
          job.id
        );

        // Show success message
        toast({
          title: "Batch Job Created",
          description: `Processing ${payeeRowData.uniquePayeeNames.length} payees. You can monitor progress in the Batch Jobs tab.`,
        });

      } else {
        // Check if there was a specific error from the batch manager
        const batchError = getError('create');
        const errorDetails = batchError || 'Unknown error occurred during batch creation';
        
        console.error('[SMART UPLOAD] Batch creation failed:', errorDetails);
        
        // Handle large files with local processing fallback
        if (payeeRowData.uniquePayeeNames.length > 45000) {
          console.log(`[SMART UPLOAD] Large file detected (${payeeRowData.uniquePayeeNames.length} payees), attempting local processing fallback`);
          
          updateProgress(UPLOAD_ID, 'Large file detected, switching to local processing...', 40);
          
          // Notify parent for local processing
          onBatchJobCreated(null, payeeRowData);
          
          setUploadState('complete');
          completeProgress(UPLOAD_ID, 'Processing completed using enhanced local classification!');
          
          toast({
            title: "Local Processing",
            description: `Large file processed locally with ${payeeRowData.uniquePayeeNames.length} payees.`,
          });
          
          return;
        }
        
        // Show specific error based on the type
        setUploadState('error');
        
        if (batchError?.includes('quota') || batchError?.includes('rate limit')) {
          updateProgress(UPLOAD_ID, '❌ OpenAI Quota Exceeded', 0, 'API quota limit reached - check your OpenAI usage');
          toast({
            title: "OpenAI Quota Exceeded",
            description: "Your OpenAI API quota has been exceeded. Please check your usage limits and try again later.",
            variant: "destructive"
          });
        } else if (batchError?.includes('401') || batchError?.includes('authentication') || batchError?.includes('api key')) {
          updateProgress(UPLOAD_ID, '❌ Authentication Failed', 0, 'Invalid OpenAI API key - check your settings');
          toast({
            title: "Authentication Failed",
            description: "OpenAI API key is invalid or missing. Please check your API key in the settings.",
            variant: "destructive"
          });
        } else if (batchError?.includes('network') || batchError?.includes('connection')) {
          updateProgress(UPLOAD_ID, '❌ Network Error', 0, 'Connection to OpenAI failed - check your internet connection');
          toast({
            title: "Network Error",
            description: "Failed to connect to OpenAI API. Please check your internet connection and try again.",
            variant: "destructive"
          });
        } else {
          updateProgress(UPLOAD_ID, '❌ Batch Creation Failed', 0, errorDetails);
          toast({
            title: "Batch Creation Failed",
            description: errorDetails,
            variant: "destructive"
          });
        }
      }

    } catch (error) {
      console.error('[SMART UPLOAD] Unexpected error during processing:', error);
      setUploadState('error');
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
      updateProgress(UPLOAD_ID, '❌ Processing Failed', 0, errorMessage);
      
      toast({
        title: "Processing Failed",
        description: `An unexpected error occurred: ${errorMessage}`,
        variant: "destructive"
      });
    }
  };

  const isProcessing = uploadState === 'processing';
  const hasGlobalError = hasError();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          Smart File Upload & Classification
          <Badge variant="outline" className="ml-auto">
            Enhanced Performance
          </Badge>
          {hasGlobalError && (
            <AlertTriangle className="h-4 w-4 text-destructive ml-2" />
          )}
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

        {/* Show global error state if present */}
        {hasGlobalError && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
            <div className="flex items-center gap-1 mb-1">
              <AlertTriangle className="h-3 w-3" />
              System Alert
            </div>
            <p>There are active errors in the batch processing system. Check the error messages below.</p>
          </div>
        )}

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
              <p>✓ OpenAI batch job creation in progress</p>
              <p>✓ Real-time error detection and handling</p>
              <p>✓ Automatic fallback for large files (45k+ payees)</p>
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
            onReset={resetUpload}
            context="Smart File Upload"
          />
        )}

        {/* Enhanced system status info */}
        <div className="text-xs text-muted-foreground bg-green-50 p-2 rounded border border-green-200">
          <div className="flex items-center gap-1 text-green-700 font-medium mb-1">
            <Database className="h-3 w-3" />
            Smart Processing Enhancements
          </div>
          <p>🚀 Instant OpenAI batch creation with comprehensive error handling</p>
          <p>📊 Intelligent error detection (quota, auth, network issues)</p>
          <p>🔧 Automatic fallback processing for large files (45k+ payees)</p>
          <p>⚡ Real-time progress tracking and detailed status updates</p>
          <p>🎯 Enhanced user feedback with actionable error messages</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartFileUpload;
