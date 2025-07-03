
import { processInChunks, ChunkProcessorOptions } from '../performance/chunkProcessor';
import { DataStandardizationResult } from './types';
import { standardizePayeeName } from './nameStandardizer';

/**
 * Async batch standardization for multiple names with chunked processing
 * Maintains 1:1 record mapping and prevents browser blocking
 */
export async function batchStandardizeNamesAsync(
  names: (string | null | undefined)[],
  onProgress?: (processed: number, total: number, percentage: number) => void
): Promise<DataStandardizationResult[]> {
  productionLogger.debug(`[DATA STANDARDIZATION ASYNC] Processing ${names.length} names for standardization with chunked processing`);
  
  const chunkOptions: ChunkProcessorOptions = {
    chunkSize: names.length > 10000 ? 200 : 100,
    delayMs: names.length > 5000 ? 15 : 10,
    onProgress: onProgress
  };

  const { results } = await processInChunks(
    names,
    (name, index) => {
      const result = standardizePayeeName(name);
      
      if (index < 3) {
        productionLogger.debug(`[DATA STANDARDIZATION ASYNC] Row ${index}: "${result.original}" → "${result.normalized}" (${result.cleaningSteps.length} steps)`);
      }
      
      return result;
    },
    chunkOptions
  );
  
  // Validation: Ensure 1:1 mapping
  if (results.length !== names.length) {
    throw new Error(`CRITICAL: Async standardization failed 1:1 mapping - input: ${names.length}, output: ${results.length}`);
  }
  
  productionLogger.debug(`[DATA STANDARDIZATION ASYNC] Successfully processed ${results.length} names with consistent normalization`);
  return results;
}

/**
 * Batch standardization for multiple names (synchronous - for backward compatibility)
 * Maintains 1:1 record mapping
 */
export function batchStandardizeNames(names: (string | null | undefined)[]): DataStandardizationResult[] {
  productionLogger.debug(`[DATA STANDARDIZATION] Processing ${names.length} names for standardization`);
  
  const results = names.map((name, index) => {
    const result = standardizePayeeName(name);
    
    if (index < 3) {
      productionLogger.debug(`[DATA STANDARDIZATION] Row ${index}: "${result.original}" → "${result.normalized}" (${result.cleaningSteps.length} steps)`);
    }
    
    return result;
  });
  
  // Validation: Ensure 1:1 mapping
  if (results.length !== names.length) {
    throw new Error(`CRITICAL: Standardization failed 1:1 mapping - input: ${names.length}, output: ${results.length}`);
  }
  
  productionLogger.debug(`[DATA STANDARDIZATION] Successfully processed ${results.length} names with consistent normalization`);
  return results;
}
