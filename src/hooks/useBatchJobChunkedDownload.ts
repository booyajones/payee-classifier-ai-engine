
import { BatchJob, getBatchJobResults } from "@/lib/openai/trueBatchAPI";
import { useRetry } from "@/hooks/useRetry";

const CHUNK_SIZE = 500;
const DOWNLOAD_TIMEOUT = 30000;

export const useBatchJobChunkedDownload = () => {
  const {
    execute: downloadResultsWithRetry,
    isRetrying: isDownloadRetrying
  } = useRetry(getBatchJobResults, { maxRetries: 3, baseDelay: 2000 });

  const downloadChunkedResults = async (
    job: BatchJob,
    uniquePayeeNames: string[],
    onProgress: (current: number, total: number) => void,
    isDownloadCancelled: (jobId: string) => boolean
  ) => {
    const chunks = [];
    for (let i = 0; i < uniquePayeeNames.length; i += CHUNK_SIZE) {
      chunks.push(uniquePayeeNames.slice(i, i + CHUNK_SIZE));
    }

    console.log(`[CHUNKED DOWNLOAD] Processing ${chunks.length} chunks for ${uniquePayeeNames.length} payees`);
    
    const allResults = [];
    
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      if (isDownloadCancelled && typeof isDownloadCancelled === 'function' && isDownloadCancelled(job.id)) {
        console.log(`[CHUNKED DOWNLOAD] Download cancelled for job ${job.id}`);
        throw new Error('Download cancelled by user');
      }

      const chunk = chunks[chunkIndex];
      console.log(`[CHUNKED DOWNLOAD] Processing chunk ${chunkIndex + 1}/${chunks.length} with ${chunk.length} payees`);
      
      try {
        const chunkPromise = downloadResultsWithRetry(job, chunk);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Chunk ${chunkIndex + 1} timed out after ${DOWNLOAD_TIMEOUT}ms`)), DOWNLOAD_TIMEOUT);
        });

        const chunkResults = await Promise.race([chunkPromise, timeoutPromise]) as any[];
        allResults.push(...chunkResults);
        
        // Safe progress update
        try {
          if (onProgress && typeof onProgress === 'function') {
            onProgress(allResults.length, uniquePayeeNames.length);
          }
        } catch (error) {
          console.warn(`[CHUNKED DOWNLOAD] Progress callback error:`, error);
        }
        
        if (chunkIndex < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`[CHUNKED DOWNLOAD] Chunk ${chunkIndex + 1} failed:`, error);
        
        if (allResults.length > 0) {
          console.log(`[CHUNKED DOWNLOAD] Saving partial results: ${allResults.length}/${uniquePayeeNames.length}`);
          throw new Error(`Partial download completed: ${allResults.length}/${uniquePayeeNames.length} results downloaded. Chunk ${chunkIndex + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        throw error;
      }
    }

    return allResults;
  };

  return {
    downloadChunkedResults,
    isDownloadRetrying
  };
};
