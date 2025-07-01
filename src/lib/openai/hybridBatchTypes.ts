
import { BatchJob } from './trueBatchAPI';

export interface HybridBatchResult {
  results: Array<{
    classification: 'Business' | 'Individual';
    confidence: number;
    reasoning: string;
    processingTier: 'Rule-Based' | 'AI-Powered' | 'Failed' | 'NLP-Based' | 'AI-Assisted' | 'Excluded';
  }>;
  batchJob?: BatchJob;
  stats?: {
    keywordExcluded: number;
    aiProcessed: number;
    phase: string;
  };
}

export interface BatchStats {
  keywordExcluded: number;
  aiProcessed: number;
  phase: string;
}

export type ProgressCallback = (
  current: number,
  total: number,
  percentage: number,
  stats?: BatchStats
) => void;
