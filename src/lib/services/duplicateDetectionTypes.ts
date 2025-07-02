import { SimilarityScores } from '@/lib/classification/stringMatching';

export interface DuplicateDetectionConfig {
  highConfidenceThreshold: number; // Default: 95
  lowConfidenceThreshold: number;  // Default: 75
  enableAiJudgment: boolean;       // Default: true
  algorithmWeights: {
    jaroWinkler: number;  // Default: 0.2
    tokenSort: number;    // Default: 0.4
    tokenSet: number;     // Default: 0.4
  };
}

export interface DuplicateDetectionInput {
  payee_id: string;
  payee_name: string;
}

export interface DuplicateDetectionOutput extends DuplicateDetectionInput {
  is_potential_duplicate: boolean;
  duplicate_of_payee_id: string | null;
  final_duplicate_score: number;
  judgement_method: 'Algorithmic - High Confidence' | 'Algorithmic - Low Confidence' | 'AI Judgment';
  ai_judgement_is_duplicate: boolean | null;
  ai_judgement_reasoning: string | null;
  duplicate_group_id: string;
  similarity_scores?: SimilarityScores;
}

export interface DuplicatePair {
  record1: DuplicateDetectionInput;
  record2: DuplicateDetectionInput;
  similarity_scores: SimilarityScores;
  final_duplicate_score: number;
  confidence_tier: 'High' | 'Low' | 'Ambiguous';
}

export interface AiDuplicateJudgment {
  is_duplicate: boolean;
  confidence: number;
  reasoning: string;
}

export interface DuplicateGroup {
  group_id: string;
  canonical_payee_id: string;
  canonical_payee_name: string;
  members: DuplicateDetectionOutput[];
  total_score: number;
}

export interface DuplicateDetectionResult {
  processed_records: DuplicateDetectionOutput[];
  duplicate_groups: DuplicateGroup[];
  statistics: {
    total_processed: number;
    duplicates_found: number;
    high_confidence_matches: number;
    low_confidence_matches: number;
    ai_judgments_made: number;
    processing_time_ms: number;
  };
}

export const DEFAULT_DUPLICATE_CONFIG: DuplicateDetectionConfig = {
  highConfidenceThreshold: 85, // Lowered to catch obvious duplicates like "Christa" variants
  lowConfidenceThreshold: 60,  // Lowered to allow more cases to reach AI judgment
  enableAiJudgment: true,
  algorithmWeights: {
    jaroWinkler: 0.2,
    tokenSort: 0.4,
    tokenSet: 0.4
  }
};