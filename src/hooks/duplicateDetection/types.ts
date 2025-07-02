import { DuplicateDetectionResult, DuplicateDetectionConfig } from '@/lib/services/duplicateDetectionTypes';

/**
 * Types and interfaces for duplicate detection hook
 */

export interface DuplicateDetectionState {
  isProcessing: boolean;
  result: DuplicateDetectionResult | null;
  error: string | null;
  config: DuplicateDetectionConfig;
}

export const DEFAULT_DUPLICATE_DETECTION_CONFIG: DuplicateDetectionConfig = {
  highConfidenceThreshold: 95,
  lowConfidenceThreshold: 75,
  enableAiJudgment: true,
  algorithmWeights: {
    jaroWinkler: 0.2,
    tokenSort: 0.4,
    tokenSet: 0.4
  }
};