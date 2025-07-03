import {
  DuplicateDetectionConfig,
  DuplicateDetectionInput,
  DuplicateDetectionResult,
  DEFAULT_DUPLICATE_CONFIG
} from '../duplicateDetectionTypes';
import { cleanRecords } from './dataProcessor';
import { findDuplicatePairs } from './pairAnalyzer';
import { processWithTieredLogic } from './tieredProcessor';
import { generateEnrichedOutput, createDuplicateGroups } from './groupManager';
import { generateStatistics } from './statisticsGenerator';

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
    const cleanedRecords = cleanRecords(records);
    console.log(`[DUPLICATE ENGINE] Cleaned ${cleanedRecords.length} records`);

    // Step 2: Multi-algorithm similarity analysis
    const duplicatePairs = findDuplicatePairs(cleanedRecords, this.config);
    console.log(`[DUPLICATE ENGINE] Found ${duplicatePairs.length} potential duplicate pairs`);

    // Step 3: Three-tiered logic funnel
    const processedPairs = await processWithTieredLogic(duplicatePairs, this.config);
    console.log(`[DUPLICATE ENGINE] Processed pairs with tiered logic`);

    // Step 4: Generate enriched output
    const processedRecords = generateEnrichedOutput(records, processedPairs);
    const duplicateGroups = createDuplicateGroups(processedRecords);

    const processingTime = Date.now() - startTime;
    const statistics = generateStatistics(processedRecords, processingTime);

    console.log(`[DUPLICATE ENGINE] Completed in ${processingTime}ms`);
    console.log(`[DUPLICATE ENGINE] Statistics:`, statistics);

    return {
      processed_records: processedRecords,
      duplicate_groups: duplicateGroups,
      statistics
    };
  }
}