/**
 * Duplicate detection module exports
 */

export { SmartDuplicateDetectionEngine } from './duplicateEngine';
export { cleanRecords } from './dataProcessor';
export { findDuplicatePairs } from './pairAnalyzer';
export { processWithTieredLogic, type ProcessedPair } from './tieredProcessor';
export { generateEnrichedOutput, createDuplicateGroups } from './groupManager';
export { generateStatistics } from './statisticsGenerator';

// Re-export main convenience function
export { detectDuplicates } from './api';