import { normalizeForDuplicateDetection } from '@/lib/classification/enhancedNormalization';
import { DuplicateDetectionInput } from '../duplicateDetectionTypes';

/**
 * Data processing utilities for duplicate detection
 */

/**
 * Clean and normalize payee names for duplicate detection
 */
export function cleanRecords(records: DuplicateDetectionInput[]): Array<DuplicateDetectionInput & { cleaned_name: string }> {
  return records.map(record => {
    // Use enhanced normalization for better duplicate detection
    const cleaned_name = normalizeForDuplicateDetection(record.payee_name);
    return {
      ...record,
      cleaned_name
    };
  });
}
