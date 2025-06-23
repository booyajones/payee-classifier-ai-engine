
import { useState, useCallback } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { useSmartBatchCreation } from './useSmartBatchCreation';
import { useSmartBatchMonitoring } from './useSmartBatchMonitoring';
import { chunkPayeeData, createPayeeRowDataFromChunk, calculateChunkedProgress, FileChunk, ChunkJobResult } from '@/lib/fileChunking';
import { useToast } from '@/hooks/use-toast';

export const useChunkedBatchManager = () => {
  const [chunkJobs, setChunkJobs] = useState<Record<string, ChunkJobResult[]>>({});
  const [chunkProgress, setChunkProgress] = useState<Record<string, Record<string, { current: number; total: number; status: string }>>>({});
  const [chunkResults, setChunkResults] = useState<Record<string, PayeeClassification[]>>({});

  const { createBatchWithFallback } = useSmartBatchCreation();
  const { initializeSmartState, startIntelligentMonitoring, getSmartState } = useSmartBatchMonitoring();
  const { toast } = useToast();

  const createChunkedBatchJob = useCallback(async (
    payeeRowData: PayeeRowData,
    description?: string,
    onJobUpdate?: (job: BatchJob) => void,
    onJobComplete?: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void
  ): Promise<BatchJob | null> => {
    try {
      const chunks = chunkPayeeData(payeeRowData);

      if (chunks.length === 1) {
        // No chunking needed, use regular processing
        console.log('[CHUNKED BATCH] File size within limits, using regular processing');
        const job = await createBatchWithFallback(payeeRowData, description);
        if (job) {
          initializeSmartState(job.id);
          startIntelligentMonitoring(job, payeeRowData, onJobUpdate, onJobComplete);
        }
        return job;
      }

      console.log(`[CHUNKED BATCH] Creating ${chunks.length} chunk jobs for large file`);
      
      const chunkJobResults: ChunkJobResult[] = [];
      let completedChunks = 0;
      let firstChunkJobId = '';

      // Create batch jobs for each chunk
      for (const chunk of chunks) {
        const chunkPayeeRowData = createPayeeRowDataFromChunk(chunk, payeeRowData);
        const chunkDescription = `${description} - Chunk ${chunk.chunkIndex + 1}/${chunk.totalChunks}`;

        try {
          const chunkJob = await createBatchWithFallback(chunkPayeeRowData, chunkDescription);
          
          if (chunkJob) {
            // Use the first chunk's job ID as the parent job ID (it's a real OpenAI batch ID)
            if (chunk.chunkIndex === 0) {
              firstChunkJobId = chunkJob.id;
            }

            const chunkResult: ChunkJobResult = {
              chunkIndex: chunk.chunkIndex,
              job: chunkJob,
              payeeRowData: chunkPayeeRowData
            };

            chunkJobResults.push(chunkResult);

            // Initialize chunk progress using the first chunk job ID as parent
            const parentJobId = firstChunkJobId || chunkJob.id;
            setChunkProgress(prevProgress => ({
              ...prevProgress,
              [parentJobId]: {
                ...prevProgress[parentJobId],
                [chunkJob.id]: { current: 0, total: chunk.uniquePayeeNames.length, status: 'Starting...' }
              }
            }));

            // Start monitoring this chunk
            initializeSmartState(chunkJob.id);
            startIntelligentMonitoring(
              chunkJob,
              chunkPayeeRowData,
              (updatedJob) => {
                // Update individual chunk progress
                const smartState = getSmartState(updatedJob.id);
                const parentJobId = firstChunkJobId;
                
                setChunkProgress(currentProgress => {
                  const updatedProgress = { ...currentProgress[parentJobId] };
                  updatedProgress[updatedJob.id] = {
                    current: Math.round((smartState.progress / 100) * chunk.uniquePayeeNames.length),
                    total: chunk.uniquePayeeNames.length,
                    status: smartState.currentStage
                  };

                  const overallProgress = calculateChunkedProgress(updatedProgress);
                  
                  // Create a synthetic parent job for progress reporting
                  const parentJob: BatchJob = {
                    ...updatedJob,
                    id: parentJobId,
                    status: overallProgress.completedChunks === chunks.length ? 'completed' : 'in_progress'
                  };

                  if (onJobUpdate) {
                    onJobUpdate(parentJob);
                  }

                  return { ...currentProgress, [parentJobId]: updatedProgress };
                });
              },
              (results, summary, jobId) => {
                // Handle individual chunk completion
                console.log(`[CHUNKED BATCH] Chunk ${chunk.chunkIndex + 1} completed with ${results.length} results`);
                
                const parentJobId = firstChunkJobId;
                setChunkResults(prevResults => ({
                  ...prevResults,
                  [parentJobId]: [...(prevResults[parentJobId] || []), ...results]
                }));

                completedChunks++;

                // Check if all chunks are complete
                if (completedChunks === chunks.length) {
                  console.log(`[CHUNKED BATCH] All ${chunks.length} chunks completed, consolidating results`);
                  
                  // Get current results and consolidate
                  setChunkResults(currentResults => {
                    const allResults = currentResults[parentJobId] || [];
                    const consolidatedSummary: BatchProcessingResult = {
                      results: allResults,
                      successCount: allResults.filter(r => r.result.processingTier !== 'Failed').length,
                      failureCount: allResults.filter(r => r.result.processingTier === 'Failed').length,
                      originalFileData: payeeRowData.originalFileData
                    };

                    if (onJobComplete) {
                      onJobComplete(allResults, consolidatedSummary, parentJobId);
                    }

                    return currentResults;
                  });

                  toast({
                    title: "Chunked Processing Complete",
                    description: `Successfully processed classifications from ${chunks.length} chunks.`,
                  });
                }
              }
            );
          }
        } catch (error) {
          console.error(`[CHUNKED BATCH] Failed to create chunk ${chunk.chunkIndex + 1}:`, error);
          throw new Error(`Failed to create chunk ${chunk.chunkIndex + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Store chunk jobs using the first chunk job ID as parent
      setChunkJobs(prevJobs => ({ ...prevJobs, [firstChunkJobId]: chunkJobResults }));
      setChunkProgress(prevProgress => ({ ...prevProgress, [firstChunkJobId]: {} }));
      setChunkResults(prevResults => ({ ...prevResults, [firstChunkJobId]: [] }));

      toast({
        title: "Large File Processing Started",
        description: `Split into ${chunks.length} chunks for processing. Each chunk will be processed separately.`,
      });

      // Return the first chunk job as the parent (it's a real OpenAI batch job)
      return chunkJobResults[0]?.job || null;

    } catch (error) {
      console.error('[CHUNKED BATCH] Failed to create chunked batch job:', error);
      throw error;
    }
  }, [createBatchWithFallback, initializeSmartState, startIntelligentMonitoring, getSmartState, toast]);

  const getChunkedProgress = useCallback((parentJobId: string) => {
    const progress = chunkProgress[parentJobId] || {};
    return calculateChunkedProgress(progress);
  }, [chunkProgress]);

  return {
    createChunkedBatchJob,
    getChunkedProgress,
    chunkJobs,
    chunkProgress
  };
};
