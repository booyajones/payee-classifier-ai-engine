
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';

export interface BatchProcessorOptions {
  chunkSize?: number;
  delayMs?: number;
  onProgress?: (processed: number, total: number, percentage: number) => void;
}

export interface BatchProcessorStats {
  businessCount: number;
  individualCount: number;
  excludedCount: number;
  sicCodeCount: number;
}

export interface ProcessBatchResultsParams {
  rawResults: any[];
  uniquePayeeNames: string[];
  payeeData: any;
  job: any;
  onProgress?: (processed: number, total: number, percentage: number) => void;
}

export interface ProcessBatchResultsReturn {
  finalClassifications: PayeeClassification[];
  summary: BatchProcessingResult;
}
