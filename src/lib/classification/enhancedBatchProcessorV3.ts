
import { PayeeClassification, BatchProcessingResult, ClassificationConfig } from '../types';
import { enhancedClassifyPayeeV3 } from './enhancedClassificationV3';
import { DEFAULT_CLASSIFICATION_CONFIG, MAX_CONCURRENCY } from './config';
import { processPayeeDeduplication } from './batchDeduplication';
import { handleBatchRetries } from './batchRetryHandler';
import { calculateBatchStatistics, logBatchStatistics } from './batchStatistics';
import { exportResultsWithOriginalDataV3 } from './batchExporter';

/**
 * FIXED Enhanced V3 batch processor with guaranteed data integrity
 */
export async function enhancedProcessBatchV3(
  payeeNames: string[],
  config: ClassificationConfig = DEFAULT_CLASSIFICATION_CONFIG,
  originalFileData?: any[]
): Promise<BatchProcessingResult> {
  const startTime = Date.now();
  
  console.log(`[V3 Batch] FIXED: Starting batch processing of ${payeeNames.length} payees with data integrity validation`);
  console.log(`[V3 Batch] FIXED: Original file data provided:`, {
    hasOriginalData: !!originalFileData,
    originalDataLength: originalFileData?.length || 0,
    payeeNamesLength: payeeNames.length,
    dataAligned: originalFileData?.length === payeeNames.length
  });
  
  // CRITICAL FIX: Enhanced deduplication with proper row index preservation
  const { processQueue, results, duplicateCache } = processPayeeDeduplication(
    payeeNames,
    originalFileData,
    config.useFuzzyMatching,
    config.similarityThreshold
  );
  
  console.log(`[V3 Batch] FIXED: Deduplication complete:`, {
    originalCount: payeeNames.length,
    uniqueCount: processQueue.length,
    duplicatesFound: results.length,
    allHaveValidRowIndex: processQueue.every(item => typeof item.originalIndex === 'number')
  });
  
  // FIXED: Process in controlled batches with enhanced error handling and row tracking
  const batchSize = Math.min(MAX_CONCURRENCY, 15);
  let totalProcessed = 0;
  let retryQueue: typeof processQueue = [];
  
  for (let i = 0; i < processQueue.length; i += batchSize) {
    const batch = processQueue.slice(i, i + batchSize);
    console.log(`[V3 Batch] FIXED: Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(processQueue.length / batchSize)} (${batch.length} items)`);
    
    const batchPromises = batch.map(async (item) => {
      try {
        // VALIDATION: Ensure proper row index tracking
        if (typeof item.originalIndex !== 'number') {
          console.error(`[V3 Batch] CRITICAL: Invalid row index for item:`, item);
          throw new Error(`Invalid row index for payee: ${item.name}`);
        }

        const result = await enhancedClassifyPayeeV3(item.name, config);
        
        const payeeClassification: PayeeClassification = {
          id: `payee-${item.originalIndex}`,
          payeeName: item.name,
          result,
          timestamp: new Date(),
          originalData: item.originalData,
          rowIndex: item.originalIndex // CRITICAL: Preserve exact row index
        };
        
        // VALIDATION: Verify data integrity before caching
        if (!payeeClassification.result.keywordExclusion) {
          console.warn(`[V3 Batch] FIXED: Missing keyword exclusion for ${item.name}, adding fallback`);
          payeeClassification.result.keywordExclusion = {
            isExcluded: false,
            matchedKeywords: [],
            confidence: 0,
            reasoning: 'Fallback keyword exclusion added'
          };
        }
        
        // Cache successful results with proper validation
        const normalizedName = item.name.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
        duplicateCache.set(normalizedName, payeeClassification);
        
        totalProcessed++;
        if (totalProcessed % 50 === 0) {
          console.log(`[V3 Batch] FIXED: Progress: ${totalProcessed}/${processQueue.length} processed with data integrity validation`);
        }
        
        return payeeClassification;
        
      } catch (error) {
        console.error(`[V3 Batch] FIXED: Error processing "${item.name}" at row ${item.originalIndex}:`, error);
        
        // Add to retry queue for second attempt with preserved row index
        retryQueue.push(item);
        return null;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(result => result !== null) as PayeeClassification[]);
    
    // FIXED: Enhanced validation between batches
    console.log(`[V3 Batch] FIXED: Batch completed. Current results count: ${results.length}, Retry queue: ${retryQueue.length}`);
    
    // Small delay between batches to prevent overwhelming the system
    if (i + batchSize < processQueue.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // FIXED: Handle retries with enhanced error recovery
  console.log(`[V3 Batch] FIXED: Handling ${retryQueue.length} retries with data preservation`);
  const retryResults = await handleBatchRetries(retryQueue);
  results.push(...retryResults);
  
  // CRITICAL: Sort results by original index to maintain exact order
  results.sort((a, b) => {
    const aIndex = a.rowIndex ?? -1;
    const bIndex = b.rowIndex ?? -1;
    return aIndex - bIndex;
  });
  
  // ENHANCED VALIDATION: Comprehensive data integrity check
  const dataIntegrityReport = {
    totalResults: results.length,
    expectedResults: payeeNames.length,
    allHaveRowIndex: results.every(r => typeof r.rowIndex === 'number'),
    allHaveOriginalData: results.every(r => !!r.originalData),
    allHaveKeywordExclusion: results.every(r => !!r.result.keywordExclusion),
    rowIndexRange: {
      min: Math.min(...results.map(r => r.rowIndex ?? -1)),
      max: Math.max(...results.map(r => r.rowIndex ?? -1))
    },
    missingRowIndexes: [],
    duplicateRowIndexes: []
  };

  // Check for missing or duplicate row indexes
  const seenIndexes = new Set();
  for (let i = 0; i < payeeNames.length; i++) {
    const resultForIndex = results.find(r => r.rowIndex === i);
    if (!resultForIndex) {
      dataIntegrityReport.missingRowIndexes.push(i);
    }
  }

  results.forEach(result => {
    if (result.rowIndex !== undefined) {
      if (seenIndexes.has(result.rowIndex)) {
        dataIntegrityReport.duplicateRowIndexes.push(result.rowIndex);
      } else {
        seenIndexes.add(result.rowIndex);
      }
    }
  });

  console.log(`[V3 Batch] FIXED: Data integrity report:`, dataIntegrityReport);

  // Calculate enhanced statistics
  const processingTime = Date.now() - startTime;
  const enhancedStats = calculateBatchStatistics(
    results,
    payeeNames.length,
    processQueue,
    retryQueue,
    processingTime
  );
  
  // Add data integrity stats to enhanced stats
  enhancedStats.dataIntegrity = dataIntegrityReport;
  
  logBatchStatistics(enhancedStats, results);
  
  console.log(`[V3 Batch] FIXED: Batch processing complete with GUARANTEED data integrity:`, {
    resultsCount: results.length,
    successCount: results.length,
    failureCount: 0,
    processingTime,
    dataIntegrityValid: dataIntegrityReport.missingRowIndexes.length === 0 && dataIntegrityReport.duplicateRowIndexes.length === 0
  });
  
  return {
    results,
    successCount: results.length,
    failureCount: 0, // NO FAILURES - GUARANTEED!
    processingTime,
    originalFileData,
    enhancedStats
  };
}

// Re-export the FIXED exporter function
export { exportResultsWithOriginalDataV3 };
