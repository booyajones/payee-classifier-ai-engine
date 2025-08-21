
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { PayeeRowData } from '@/lib/rowMapping';
import { BatchJob } from '@/lib/openai/trueBatchAPI';

/**
 * Raw result returned from the classification engine. Results may either be
 * provided directly or nested under a `result` property depending on the
 * source of the data.
 */
export interface BatchClassificationResult {
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
  sicCode?: string;
  sicDescription?: string;
}

// Support both { classification: ... } and { result: { classification: ... } }
export type RawBatchResult =
  | BatchClassificationResult
  | { result: BatchClassificationResult };

export interface DuplicateData {
  is_potential_duplicate: boolean;
  duplicate_of_payee_id: string | null;
  duplicate_confidence_score: number;
  duplicate_detection_method: string;
  duplicate_group_id: string;
  ai_duplicate_reasoning: string;
}

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
  rawResults: RawBatchResult[];
  uniquePayeeNames: string[];
  payeeData: PayeeRowData;
  job: BatchJob;
  onProgress?: (processed: number, total: number, percentage: number) => void;
}

export interface ProcessBatchResultsReturn {
  finalClassifications: PayeeClassification[];
  summary: BatchProcessingResult;
}
