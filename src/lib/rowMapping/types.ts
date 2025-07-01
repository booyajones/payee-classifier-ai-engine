
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
}
