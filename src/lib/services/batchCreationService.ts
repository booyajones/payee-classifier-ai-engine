
import { BatchJob, createBatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { batchProcessingService } from './batchProcessingService';
import { batchValidationService } from './batchValidationService';
import { DEFAULT_CLASSIFICATION_CONFIG } from '@/lib/classification/config';

interface BatchCreationOptions {
  description?: string;
  onJobComplete?: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
  silent?: boolean;
}

export class BatchCreationService {
  private static instance: BatchCreationService;
  
  static getInstance(): BatchCreationService {
    if (!BatchCreationService.instance) {
      BatchCreationService.instance = new BatchCreationService();
    }
    return BatchCreationService.instance;
  }

  async createBatch(
    payeeRowData: PayeeRowData,
    options: BatchCreationOptions = {}
  ): Promise<BatchJob | null> {
    const { description, onJobComplete, silent = false } = options;
    
    console.log(`[BATCH CREATION] Creating batch for ${payeeRowData.uniquePayeeNames.length} payees with SIC codes`);
    
    // Validate input using the dedicated validation service
    batchValidationService.validateBatchInput(payeeRowData);

    // For large files (>45k payees), use local processing with SIC codes
    if (payeeRowData.uniquePayeeNames.length > 45000) {
      return await this.handleLargeFileProcessing(payeeRowData, onJobComplete, silent);
    }

    // Create OpenAI batch job for smaller files
    return await this.createOpenAIBatch(payeeRowData, description);
  }

  private async handleLargeFileProcessing(
    payeeRowData: PayeeRowData,
    onJobComplete?: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void,
    silent: boolean = false
  ): Promise<null> {
    console.log(`[BATCH CREATION] Large file detected, using local processing with SIC codes`);

    const result = await batchProcessingService.processBatch(
      payeeRowData.uniquePayeeNames,
      {
        ...DEFAULT_CLASSIFICATION_CONFIG,
        offlineMode: true,
        aiThreshold: 75,
        useEnhanced: true,
        includeSicCodes: true
      },
      payeeRowData.originalFileData
    );

    console.log(`[BATCH CREATION] Local processing complete with SIC codes: ${result.results.filter(r => r.result.sicCode).length} SIC codes assigned`);

    if (onJobComplete) {
      onJobComplete(result.results, result, 'local-processing');
    }

    return null; // No OpenAI batch job created
  }

  private async createOpenAIBatch(
    payeeRowData: PayeeRowData,
    description?: string
  ): Promise<BatchJob> {
    console.log(`[BATCH CREATION] Creating OpenAI batch job with SIC code support`);
    
    const job = await createBatchJob(payeeRowData.uniquePayeeNames, description);
    console.log(`[BATCH CREATION] Created OpenAI batch job: ${job.id}`);
    
    return job;
  }
}

export const batchCreationService = BatchCreationService.getInstance();
