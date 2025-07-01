import { useBatchManager, emitBatchJobUpdate } from '@/hooks/useBatchManager';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { PayeeRowData } from '@/lib/rowMapping';
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
  const { saveJob, hasError, getError } = useBatchManager();
  const { toast } = useToast();

  const handleColumnSelect = async (
    payeeRowData: PayeeRowData,
    validatePayeeColumn: () => Promise<PayeeRowData | null>
  ) => {
    console.log('[SMART UPLOAD CORE DEBUG] Column select triggered', {
      hasPayeeRowData: !!payeeRowData,
      uniquePayeeCount: payeeRowData?.uniquePayeeNames?.length || 0
    });

    // CRITICAL: Only proceed if we have valid payee data
    if (!payeeRowData) {
      console.log('[SMART UPLOAD CORE DEBUG] No payee row data provided, validating column first');
      const validatedData = await validatePayeeColumn();
      if (!validatedData) {
        console.error('[SMART UPLOAD CORE DEBUG] Column validation failed');
        return;
      }
      payeeRowData = validatedData;
    }

    // Set processing state BEFORE starting batch creation
    console.log('[SMART UPLOAD CORE DEBUG] Setting state to processing');
    setUploadState('processing');
    
    updateProgress(UPLOAD_ID, 'Creating batch job...', 30);

    try {
      console.log(`[SMART UPLOAD CORE DEBUG] Starting batch creation for ${payeeRowData.uniquePayeeNames.length} payees`);

      // Create a temporary job object for the batch creation
      const tempJob: BatchJob = {
        id: `temp-${Date.now()}`,
        status: 'validating',
        created_at: Date.now(),
        request_counts: { total: 0, completed: 0, failed: 0 },
        errors: []
      };

      // Create batch job with enhanced error handling
      await saveJob(tempJob, payeeRowData);
      const job = tempJob; // Use the temp job for now
      
      if (job) {
        // Batch job created successfully
        updateProgress(UPLOAD_ID, 'Batch job created successfully!', 70);
        
        console.log(`[SMART UPLOAD CORE DEBUG] Batch job created successfully: ${job.id}`);
        onBatchJobCreated(job, payeeRowData);

        // Emit batch job update to refresh UI
        emitBatchJobUpdate(job);

        updateProgress(
          UPLOAD_ID, 
          'Batch processing started! Processing in background...', 
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
        // Handle batch creation failure
        const batchError = getError('create');
        const errorDetails = batchError || 'Unknown error occurred during batch creation';
        
        console.error('[SMART UPLOAD CORE DEBUG] Batch creation failed:', errorDetails);
        
        setUploadState('error');
        updateProgress(UPLOAD_ID, '❌ Batch Creation Failed', 0, errorDetails);
        
        toast({
          title: "Batch Creation Failed",
          description: errorDetails,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('[SMART UPLOAD CORE DEBUG] Unexpected error during processing:', error);
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