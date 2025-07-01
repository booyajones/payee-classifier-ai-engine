
/**
 * Utility for processing large datasets in chunks to prevent browser blocking
 */

export interface ChunkProcessorOptions {
  chunkSize?: number;
  delayMs?: number;
  onProgress?: (processed: number, total: number, percentage: number) => void;
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
}

export interface ChunkProcessingResult<T> {
  results: T[];
  totalProcessed: number;
  processingTimeMs: number;
}

/**
 * Process an array in chunks with progress callbacks and timeout breaks
 */
export async function processInChunks<T, R>(
  items: T[],
  processor: (item: T, index: number) => R | Promise<R>,
  options: ChunkProcessorOptions = {}
): Promise<ChunkProcessingResult<R>> {
  const {
    chunkSize = getOptimalChunkSize(items.length),
    delayMs = 10,
    onProgress,
    onChunkComplete
  } = options;

  console.log(`[CHUNK PROCESSOR] Processing ${items.length} items in chunks of ${chunkSize}`);
  
  const startTime = Date.now();
  const results: R[] = new Array(items.length);
  const totalChunks = Math.ceil(items.length / chunkSize);
  let processedCount = 0;

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const startIdx = chunkIndex * chunkSize;
    const endIdx = Math.min(startIdx + chunkSize, items.length);
    const chunk = items.slice(startIdx, endIdx);

    // Process chunk synchronously
    for (let i = 0; i < chunk.length; i++) {
      const globalIndex = startIdx + i;
      const item = chunk[i];
      results[globalIndex] = await processor(item, globalIndex);
      processedCount++;
    }

    // Update progress
    const percentage = Math.round((processedCount / items.length) * 100);
    onProgress?.(processedCount, items.length, percentage);
    onChunkComplete?.(chunkIndex + 1, totalChunks);

    // Yield control to browser (except for last chunk)
    if (chunkIndex < totalChunks - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  const processingTimeMs = Date.now() - startTime;
  console.log(`[CHUNK PROCESSOR] Completed processing ${processedCount} items in ${processingTimeMs}ms`);

  return {
    results,
    totalProcessed: processedCount,
    processingTimeMs
  };
}

/**
 * Determine optimal chunk size based on dataset size
 */
function getOptimalChunkSize(totalItems: number): number {
  if (totalItems < 100) return totalItems; // Process small datasets at once
  if (totalItems < 1000) return 50;
  if (totalItems < 10000) return 100;
  return 250; // Large datasets
}

/**
 * Process items in parallel chunks (for CPU-intensive operations)
 */
export async function processInParallelChunks<T, R>(
  items: T[],
  processor: (items: T[]) => Promise<R[]>,
  options: ChunkProcessorOptions = {}
): Promise<ChunkProcessingResult<R>> {
  const { chunkSize = getOptimalChunkSize(items.length), onProgress } = options;
  
  console.log(`[PARALLEL CHUNK PROCESSOR] Processing ${items.length} items in parallel chunks of ${chunkSize}`);
  
  const startTime = Date.now();
  const chunks: T[][] = [];
  
  // Create chunks
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }

  // Process chunks in parallel with some concurrency limit
  const maxConcurrency = Math.min(4, chunks.length);
  const results: R[] = [];
  
  for (let i = 0; i < chunks.length; i += maxConcurrency) {
    const chunkBatch = chunks.slice(i, i + maxConcurrency);
    const chunkPromises = chunkBatch.map(chunk => processor(chunk));
    const chunkResults = await Promise.all(chunkPromises);
    
    // Flatten results
    results.push(...chunkResults.flat());
    
    // Update progress
    const processed = Math.min((i + maxConcurrency) * chunkSize, items.length);
    const percentage = Math.round((processed / items.length) * 100);
    onProgress?.(processed, items.length, percentage);
    
    // Small delay between batches
    if (i + maxConcurrency < chunks.length) {
      await new Promise(resolve => setTimeout(resolve, 5));
    }
  }

  const processingTimeMs = Date.now() - startTime;
  console.log(`[PARALLEL CHUNK PROCESSOR] Completed processing ${results.length} items in ${processingTimeMs}ms`);

  return {
    results,
    totalProcessed: results.length,
    processingTimeMs
  };
}
