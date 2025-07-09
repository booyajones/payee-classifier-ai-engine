
import { DataStandardizationResult } from '../dataStandardization';

export interface RowMapping {
  originalRowIndex: number;
  payeeName: string;
  normalizedPayeeName: string;
  uniquePayeeIndex: number;
  standardizationResult: DataStandardizationResult;
}

export interface PayeeRowData {
  uniquePayeeNames: string[];
  uniqueNormalizedNames: string[];
  rowMappings: RowMapping[];
  originalFileData: any[];
  standardizationStats: {
    totalProcessed: number;
    changesDetected: number;
    averageStepsPerName: number;
    mostCommonSteps: Array<{ step: string; count: number }>;
  };
  duplicateDetectionResults?: {
    processed_records: any[];
    duplicate_groups: any[];
    statistics: {
      total_processed: number;
      duplicates_found: number;
      high_confidence_matches: number;
      low_confidence_matches: number;
      ai_judgments_made: number;
      processing_time_ms: number;
    };
  };
  // Additional properties for enhanced batch operations
  selectedPayeeColumn?: string;
  fileName?: string;
  fileSizeBytes?: number;
  fileHeaders?: string[];
  fileData?: any[];
  originalRecordCount?: number;
}
