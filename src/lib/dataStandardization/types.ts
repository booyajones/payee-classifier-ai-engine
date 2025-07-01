
/**
 * Types for data standardization operations
 */

export interface DataStandardizationResult {
  original: string;
  normalized: string;
  cleaningSteps: string[];
}

export interface StandardizationStats {
  totalProcessed: number;
  changesDetected: number;
  averageStepsPerName: number;
  mostCommonSteps: Array<{ step: string; count: number }>;
}
