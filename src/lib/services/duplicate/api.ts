import { SmartDuplicateDetectionEngine } from './duplicateEngine';
import {
  DuplicateDetectionInput,
  DuplicateDetectionConfig,
  DuplicateDetectionResult
} from '../duplicateDetectionTypes';

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