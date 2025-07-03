import { DuplicateDetectionInput, DuplicateDetectionOutput, DuplicateGroup } from '../duplicateDetectionTypes';
import { ProcessedPair } from './tieredProcessor';

/**
 * Group management utilities for duplicate detection
 */

/**
 * Generate enriched output data from processed pairs
 */
export function generateEnrichedOutput(
  originalRecords: DuplicateDetectionInput[],
  processedPairs: ProcessedPair[]
): DuplicateDetectionOutput[] {
  const output: DuplicateDetectionOutput[] = [];

  // Create a map to track duplicate relationships
  const duplicateMap = new Map<string, {
    duplicate_of: string;
    duplicate_of_name: string;
    final_duplicate_score: number;
    judgement_method: string;
    ai_judgment?: { is_duplicate: boolean; confidence: number; reasoning: string };
    similarity_scores?: any;
  }>();

  // Process duplicate pairs to build relationships
  productionLogger.debug(`[GROUP MANAGER] Processing ${processedPairs.length} pairs to build duplicate relationships`);
  for (const pair of processedPairs) {
    if (pair.is_duplicate) {
      productionLogger.debug(`[GROUP MANAGER] ✅ DUPLICATE PAIR: "${pair.record1.payee_name}" (${pair.record1.payee_id}) = "${pair.record2.payee_name}" (${pair.record2.payee_id}) - Score: ${pair.final_duplicate_score}%`);
      
      // Record2 is a duplicate of Record1 (canonical)
      duplicateMap.set(pair.record2.payee_id, {
        duplicate_of: pair.record1.payee_id,
        duplicate_of_name: pair.record1.payee_name,
        final_duplicate_score: pair.final_duplicate_score,
        judgement_method: pair.judgement_method,
        ai_judgment: pair.ai_judgment,
        similarity_scores: pair.similarity_scores
      });
    }
  }
  
  productionLogger.debug(`[GROUP MANAGER] Built duplicate map with ${duplicateMap.size} duplicate relationships`);
  for (const [payeeId, info] of duplicateMap.entries()) {
    productionLogger.debug(`[GROUP MANAGER] - ${payeeId} is duplicate of ${info.duplicate_of} (${info.final_duplicate_score}%)`);
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
        duplicate_of_payee_name: duplicateInfo.duplicate_of_name,
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
        duplicate_of_payee_name: null,
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
export function createDuplicateGroups(processedRecords: DuplicateDetectionOutput[]): DuplicateGroup[] {
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
