
import { useBatchManager, emitBatchJobUpdate } from '@/hooks/useBatchManager';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { PayeeRowData } from '@/lib/rowMapping';
import { useSmartFileUpload } from '@/hooks/useSmartFileUpload';
import { useToast } from '@/hooks/use-toast';

interface SmartFileUploadCoreProps {
  onBatchJobCreated: (batchJob: BatchJob | null, payeeRowData: PayeeRowData) => void;
  onProcessingComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
  fileName: string;
  updateProgress: (id: string, message: string, progress: number, status?: string, jobId?: string) => void;
  completeProgress: (id: string, message: string) => void;
  UPLOAD_ID: string;
  setUploadState: (state: any) => void;
}

export const useSmartFileUploadCore = ({
  onBatchJobCreated,
  onProcessingComplete,
  fileName,
  updateProgress,
  completeProgress,
  UPLOAD_ID,
  setUploadState
}: SmartFileUploadCoreProps) => {
  const { createBatch, hasError, getError } = useBatchManager();
  const { toast } = useToast();

  const handleColumnSelect = async (
    payeeRowData: PayeeRowData,
    validatePayeeColumn: () => Promise<PayeeRowData | null>
  ) => {
    const validatedData = await validatePayeeColumn();
    if (!validatedData) return;

    updateProgress(UPLOAD_ID, 'Creating OpenAI batch job...', 30);

    try {
      const jobDescription = `Smart Upload: ${fileName} (${validatedData.uniquePayeeNames.length} unique payees)`;

      console.log(`[SMART UPLOAD] Starting batch creation for ${validatedData.uniquePayeeNames.length} payees`);

      // Create batch job with enhanced error handling
      const job = await createBatch(validatedData, {
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
        silent: false
      });

      if (job) {
        // OpenAI batch created successfully
        updateProgress(UPLOAD_ID, 'Batch job created successfully!', 70);
        
        console.log(`[SMART UPLOAD] OpenAI batch created successfully: ${job.id}`);
        onBatchJobCreated(job, validatedData);

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
          description: `Processing ${validatedData.uniquePayeeNames.length} payees. You can monitor progress in the Batch Jobs tab.`,
        });

      } else {
        // Handle batch creation failure
        const batchError = getError('create');
        const errorDetails = batchError || 'Unknown error occurred during batch creation';
        
        console.error('[SMART UPLOAD] Batch creation failed:', errorDetails);
        
        // Handle large files with local processing fallback
        if (validatedData.uniquePayeeNames.length > 45000) {
          console.log(`[SMART UPLOAD] Large file detected (${validatedData.uniquePayeeNames.length} payees), attempting local processing fallback`);
          
          updateProgress(UPLOAD_ID, 'Large file detected, switching to local processing...', 40);
          
          // Notify parent for local processing
          onBatchJobCreated(null, validatedData);
          
          setUploadState('complete');
          completeProgress(UPLOAD_ID, 'Processing completed using enhanced local classification!');
          
          toast({
            title: "Local Processing",
            description: `Large file processed locally with ${validatedData.uniquePayeeNames.length} payees.`,
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

  return {
    handleColumnSelect
  };
};
