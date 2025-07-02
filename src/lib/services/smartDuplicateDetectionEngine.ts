import { calculateDuplicateScore } from '@/lib/classification/stringMatching';
import { standardizePayeeName } from '@/lib/dataStandardization/nameStandardizer';
import { normalizeForDuplicateDetection, isSameEntity } from '@/lib/classification/enhancedNormalization';
import { duplicateDetectionWithAI } from '@/lib/openai/duplicateDetection';
import {
  DuplicateDetectionConfig,
  DuplicateDetectionInput,
  DuplicateDetectionOutput,
  DuplicateDetectionResult,
  DuplicatePair,
  DuplicateGroup,
  DEFAULT_DUPLICATE_CONFIG
} from './duplicateDetectionTypes';

/**
 * Smart Duplicate Detection Engine
 * 
 * This is the core engine for sophisticated duplicate detection with:
 * - Modular architecture (name cleaning, algorithmic analysis, AI judgment)
 * - Three-tiered logic funnel (High/Low/Ambiguous confidence)
 * - Configurable thresholds and weights
 * - Complete transparency and auditability
 */
export class SmartDuplicateDetectionEngine {
  private config: DuplicateDetectionConfig;
  
  constructor(config: Partial<DuplicateDetectionConfig> = {}) {
    this.config = { ...DEFAULT_DUPLICATE_CONFIG, ...config };
    console.log('[DUPLICATE ENGINE] Initialized with config:', this.config);
  }

  /**
   * Main entry point: Process a list of payee records for duplicates
   */
  async detectDuplicates(records: DuplicateDetectionInput[]): Promise<DuplicateDetectionResult> {
    const startTime = Date.now();
    console.log(`[DUPLICATE ENGINE] Starting duplicate detection for ${records.length} records`);

    // Step 1: Data ingestion and cleaning
    const cleanedRecords = this.cleanRecords(records);
    console.log(`[DUPLICATE ENGINE] Cleaned ${cleanedRecords.length} records`);

    // Step 2: Multi-algorithm similarity analysis
    const duplicatePairs = this.findDuplicatePairs(cleanedRecords);
    console.log(`[DUPLICATE ENGINE] Found ${duplicatePairs.length} potential duplicate pairs`);

    // Step 3: Three-tiered logic funnel
    const processedPairs = await this.processWithTieredLogic(duplicatePairs);
    console.log(`[DUPLICATE ENGINE] Processed pairs with tiered logic`);

    // Step 4: Generate enriched output
    const processedRecords = this.generateEnrichedOutput(records, processedPairs);
    const duplicateGroups = this.createDuplicateGroups(processedRecords);

    const processingTime = Date.now() - startTime;
    const statistics = this.generateStatistics(processedRecords, processingTime);

    console.log(`[DUPLICATE ENGINE] Completed in ${processingTime}ms`);
    console.log(`[DUPLICATE ENGINE] Statistics:`, statistics);

    return {
      processed_records: processedRecords,
      duplicate_groups: duplicateGroups,
      statistics
    };
  }

  /**
   * Step 1: Clean and normalize payee names
   */
  private cleanRecords(records: DuplicateDetectionInput[]): Array<DuplicateDetectionInput & { cleaned_name: string }> {
    return records.map(record => {
      // Use enhanced normalization for better duplicate detection
      const cleaned_name = normalizeForDuplicateDetection(record.payee_name);
      return {
        ...record,
        cleaned_name
      };
    });
  }

  /**
   * Step 2: Find potential duplicate pairs using algorithmic analysis
   */
  private findDuplicatePairs(cleanedRecords: Array<DuplicateDetectionInput & { cleaned_name: string }>): DuplicatePair[] {
    const pairs: DuplicatePair[] = [];

    for (let i = 0; i < cleanedRecords.length; i++) {
      for (let j = i + 1; j < cleanedRecords.length; j++) {
        const record1 = cleanedRecords[i];
        const record2 = cleanedRecords[j];

        // First check if they're obviously the same entity
        const obviousDuplicate = isSameEntity(record1.payee_name, record2.payee_name);
        
        // Calculate similarity using the official duplicate detection formula
        const similarity_scores = calculateDuplicateScore(record1.cleaned_name, record2.cleaned_name);
        let final_duplicate_score = similarity_scores.duplicateScore;
        
        // Boost score for obvious duplicates (like "Christa INC" vs "CHRISTA")
        if (obviousDuplicate) {
          final_duplicate_score = Math.max(final_duplicate_score, 90);
        }

        // Determine confidence tier
        let confidence_tier: 'High' | 'Low' | 'Ambiguous';
        if (final_duplicate_score >= this.config.highConfidenceThreshold) {
          confidence_tier = 'High';
        } else if (final_duplicate_score <= this.config.lowConfidenceThreshold) {
          confidence_tier = 'Low';
        } else {
          confidence_tier = 'Ambiguous';
        }

        // Only include pairs that could be duplicates (exclude very low scores)
        if (final_duplicate_score > this.config.lowConfidenceThreshold || confidence_tier === 'Ambiguous') {
          pairs.push({
            record1: { payee_id: record1.payee_id, payee_name: record1.payee_name },
            record2: { payee_id: record2.payee_id, payee_name: record2.payee_name },
            similarity_scores,
            final_duplicate_score,
            confidence_tier
          });
        }
      }
    }

    return pairs;
  }

  /**
   * Step 3: Apply three-tiered logic funnel with AI judgment for ambiguous cases
   */
  private async processWithTieredLogic(pairs: DuplicatePair[]): Promise<Array<DuplicatePair & { 
    is_duplicate: boolean; 
    judgement_method: string;
    ai_judgment?: { is_duplicate: boolean; confidence: number; reasoning: string };
  }>> {
    const processedPairs = [];

    for (const pair of pairs) {
      if (pair.confidence_tier === 'High') {
        // High confidence: Automatic duplicate
        processedPairs.push({
          ...pair,
          is_duplicate: true,
          judgement_method: 'Algorithmic - High Confidence'
        });
        console.log(`[DUPLICATE ENGINE] High confidence duplicate: "${pair.record1.payee_name}" = "${pair.record2.payee_name}" (${pair.final_duplicate_score.toFixed(1)}%)`);

      } else if (pair.confidence_tier === 'Low') {
        // Low confidence: Automatic non-duplicate
        processedPairs.push({
          ...pair,
          is_duplicate: false,
          judgement_method: 'Algorithmic - Low Confidence'
        });

      } else if (pair.confidence_tier === 'Ambiguous' && this.config.enableAiJudgment) {
        // Ambiguous: Use AI judgment
        console.log(`[DUPLICATE ENGINE] Ambiguous case, requesting AI judgment: "${pair.record1.payee_name}" vs "${pair.record2.payee_name}" (${pair.final_duplicate_score.toFixed(1)}%)`);
        
        try {
          const aiJudgment = await duplicateDetectionWithAI(pair.record1.payee_name, pair.record2.payee_name);
          processedPairs.push({
            ...pair,
            is_duplicate: aiJudgment.is_duplicate,
            judgement_method: 'AI Judgment',
            ai_judgment: aiJudgment
          });
          console.log(`[DUPLICATE ENGINE] AI judgment: ${aiJudgment.is_duplicate ? 'DUPLICATE' : 'NOT DUPLICATE'} (${aiJudgment.confidence}%) - ${aiJudgment.reasoning}`);

        } catch (error) {
          console.error(`[DUPLICATE ENGINE] AI judgment failed, defaulting to non-duplicate:`, error);
          processedPairs.push({
            ...pair,
            is_duplicate: false,
            judgement_method: 'AI Judgment',
            ai_judgment: {
              is_duplicate: false,
              confidence: 50,
              reasoning: `AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          });
        }

      } else {
        // Ambiguous but AI disabled: Default to non-duplicate
        processedPairs.push({
          ...pair,
          is_duplicate: false,
          judgement_method: 'Algorithmic - Low Confidence'
        });
      }
    }

    return processedPairs;
  }

  /**
   * Step 4: Generate enriched output data
   */
  private generateEnrichedOutput(
    originalRecords: DuplicateDetectionInput[],
    processedPairs: Array<DuplicatePair & { 
      is_duplicate: boolean; 
      judgement_method: string;
      ai_judgment?: { is_duplicate: boolean; confidence: number; reasoning: string };
    }>
  ): DuplicateDetectionOutput[] {
    const output: DuplicateDetectionOutput[] = [];

    // Create a map to track duplicate relationships
    const duplicateMap = new Map<string, {
      duplicate_of: string;
      final_duplicate_score: number;
      judgement_method: string;
      ai_judgment?: { is_duplicate: boolean; confidence: number; reasoning: string };
      similarity_scores?: any;
    }>();

    // Process duplicate pairs to build relationships
    for (const pair of processedPairs) {
      if (pair.is_duplicate) {
        // Record2 is a duplicate of Record1 (canonical)
        duplicateMap.set(pair.record2.payee_id, {
          duplicate_of: pair.record1.payee_id,
          final_duplicate_score: pair.final_duplicate_score,
          judgement_method: pair.judgement_method,
          ai_judgment: pair.ai_judgment,
          similarity_scores: pair.similarity_scores
        });
      }
    }

    // Generate output for each original record
    for (const record of originalRecords) {
      const duplicateInfo = duplicateMap.get(record.payee_id);

      if (duplicateInfo) {
        // This record is a duplicate of another
        output.push({
          ...record,
          is_potential_duplicate: true,
          duplicate_of_payee_id: duplicateInfo.duplicate_of,
          final_duplicate_score: duplicateInfo.final_duplicate_score,
          judgement_method: duplicateInfo.judgement_method as any,
          ai_judgement_is_duplicate: duplicateInfo.ai_judgment?.is_duplicate || null,
          ai_judgement_reasoning: duplicateInfo.ai_judgment?.reasoning || null,
          duplicate_group_id: duplicateInfo.duplicate_of, // Use canonical ID as group ID
          similarity_scores: duplicateInfo.similarity_scores
        });
      } else {
        // This record is not a duplicate (or is the canonical record)
        const isCanonical = Array.from(duplicateMap.values()).some(info => info.duplicate_of === record.payee_id);
        output.push({
          ...record,
          is_potential_duplicate: false,
          duplicate_of_payee_id: null,
          final_duplicate_score: 0,
          judgement_method: 'Algorithmic - Low Confidence' as any,
          ai_judgement_is_duplicate: null,
          ai_judgement_reasoning: null,
          duplicate_group_id: isCanonical ? record.payee_id : `unique_${record.payee_id}`
        });
      }
    }

    return output;
  }

  /**
   * Create duplicate groups for easier management
   */
  private createDuplicateGroups(processedRecords: DuplicateDetectionOutput[]): DuplicateGroup[] {
    const groupMap = new Map<string, DuplicateDetectionOutput[]>();

    // Group records by duplicate_group_id
    for (const record of processedRecords) {
      const groupId = record.duplicate_group_id;
      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, []);
      }
      groupMap.get(groupId)!.push(record);
    }

    // Create duplicate groups (only for groups with multiple members)
    const duplicateGroups: DuplicateGroup[] = [];
    for (const [groupId, members] of groupMap.entries()) {
      if (members.length > 1) {
        // Find canonical record (the one that's not marked as duplicate)
        const canonical = members.find(m => !m.is_potential_duplicate) || members[0];
        
        const totalScore = members.reduce((sum, member) => sum + member.final_duplicate_score, 0) / members.length;

        duplicateGroups.push({
          group_id: groupId,
          canonical_payee_id: canonical.payee_id,
          canonical_payee_name: canonical.payee_name,
          members,
          total_score: totalScore
        });
      }
    }

    return duplicateGroups.sort((a, b) => b.total_score - a.total_score);
  }

  /**
   * Generate processing statistics
   */
  private generateStatistics(processedRecords: DuplicateDetectionOutput[], processingTime: number) {
    const duplicates = processedRecords.filter(r => r.is_potential_duplicate);
    const highConfidence = processedRecords.filter(r => r.judgement_method === 'Algorithmic - High Confidence');
    const lowConfidence = processedRecords.filter(r => r.judgement_method === 'Algorithmic - Low Confidence');
    const aiJudgments = processedRecords.filter(r => r.judgement_method === 'AI Judgment');

    return {
      total_processed: processedRecords.length,
      duplicates_found: duplicates.length,
      high_confidence_matches: highConfidence.length,
      low_confidence_matches: lowConfidence.length,
      ai_judgments_made: aiJudgments.length,
      processing_time_ms: processingTime
    };
  }
}

/**
 * Convenience function for one-off duplicate detection
 */
export async function detectDuplicates(
  records: DuplicateDetectionInput[],
  config?: Partial<DuplicateDetectionConfig>
): Promise<DuplicateDetectionResult> {
  const engine = new SmartDuplicateDetectionEngine(config);
  return await engine.detectDuplicates(records);
}