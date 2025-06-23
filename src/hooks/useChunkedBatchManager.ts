
import { useCallback } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { useSmartBatchCreation } from './useSmartBatchCreation';
import { useSmartBatchMonitoring } from './useSmartBatchMonitoring';
import { useChunkProgress } from './useChunkProgress';
import { useChunkJobs } from './useChunkJobs';
import { chunkPayeeData, createPayeeRowDataFromChunk } from '@/lib/fileChunking';
import { useToast } from '@/hooks/use-toast';

export const useChunkedBatchManager = () => {
  const { createBatchWithFallback } = useSmartBatchCreation();
  const { initializeSmartState, startIntelligentMonitoring, getSmartState } = useSmartBatchMonitoring();
  const { 
    updateChunkProgress, 
    initializeChunkProgress, 
    getChunkedProgress 
  } = useChunkProgress();
  const {
    chunkJobs,
    chunkResults,
    parentJobMetadata,
    setChunkJobsForParent,
    addChunkResults,
    initializeChunkResults,
    updateParentJobMetadata,
    isChunkedJob
  } = useChunkJobs();
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
      
      const chunkJobResults = [];
      let completedChunks = 0;
      let parentJobId = '';

      // Create batch jobs for each chunk
      for (const chunk of chunks) {
        const chunkPayeeRowData = createPayeeRowDataFromChunk(chunk, payeeRowData);
        const chunkDescription = `${description} - Chunk ${chunk.chunkIndex + 1}/${chunk.totalChunks}`;

        try {
          const chunkJob = await createBatchWithFallback(chunkPayeeRowData, chunkDescription);
          
          if (chunkJob) {
            // Use the first chunk's job ID as the parent job ID
            if (chunk.chunkIndex === 0) {
              parentJobId = chunkJob.id;
              
              // Initialize all tracking for this parent job
              updateParentJobMetadata(parentJobId, {
                isChunked: true,
                totalChunks: chunks.length,
                completedChunks: 0
              });
              initializeChunkProgress(parentJobId);
              initializeChunkResults(parentJobId);
            }

            chunkJobResults.push({
              chunkIndex: chunk.chunkIndex,
              job: chunkJob,
              payeeRowData: chunkPayeeRowData
            });

            // Initialize chunk progress
            updateChunkProgress(parentJobId, chunkJob.id, 0, chunk.uniquePayeeNames.length, 'Starting...');

            // Start monitoring this chunk
            initializeSmartState(chunkJob.id);
            startIntelligentMonitoring(
              chunkJob,
              chunkPayeeRowData,
              (updatedJob) => {
                // Update individual chunk progress
                const smartState = getSmartState(updatedJob.id);
                const current = Math.round((smartState.progress / 100) * chunk.uniquePayeeNames.length);
                
                updateChunkProgress(parentJobId, updatedJob.id, current, chunk.uniquePayeeNames.length, smartState.currentStage);
                
                // Update parent job metadata
                const overallProgress = getChunkedProgress(parentJobId);
                updateParentJobMetadata(parentJobId, {
                  isChunked: true,
                  totalChunks: chunks.length,
                  completedChunks: overallProgress.completedChunks
                });
                
                // Create synthetic status update for parent job (UI purposes only)
                if (onJobUpdate && chunk.chunkIndex === 0) {
                  const parentJob: BatchJob = {
                    ...updatedJob,
                    id: parentJobId,
                    status: overallProgress.completedChunks === chunks.length ? 'completed' : 'in_progress'
                  };
                  onJobUpdate(parentJob);
                }
              },
              (results, summary, jobId) => {
                // Handle individual chunk completion
                console.log(`[CHUNKED BATCH] Chunk ${chunk.chunkIndex + 1} completed with ${results.length} results`);
                
                addChunkResults(parentJobId, results);
                completedChunks++;

                // Check if all chunks are complete
                if (completedChunks === chunks.length) {
                  console.log(`[CHUNKED BATCH] All ${chunks.length} chunks completed, consolidating results`);
                  
                  // Get all results and consolidate
                  const allResults = chunkResults[parentJobId] || [];
                  const consolidatedSummary: BatchProcessingResult = {
                    results: allResults,
                    successCount: allResults.filter(r => r.result.processingTier !== 'Failed').length,
                    failureCount: allResults.filter(r => r.result.processingTier === 'Failed').length,
                    originalFileData: payeeRowData.originalFileData
                  };

                  if (onJobComplete) {
                    onJobComplete(allResults, consolidatedSummary, parentJobId);
                  }

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

      // Store chunk jobs using the parent job ID
      setChunkJobsForParent(parentJobId, chunkJobResults);

      toast({
        title: "Large File Processing Started",
        description: `Split into ${chunks.length} chunks for processing. Each chunk will be processed separately.`,
      });

      // Return the first chunk job as the parent
      return chunkJobResults[0]?.job || null;

    } catch (error) {
      console.error('[CHUNKED BATCH] Failed to create chunked batch job:', error);
      throw error;
    }
  }, [
    createBatchWithFallback, 
    initializeSmartState, 
    startIntelligentMonitoring, 
    getSmartState, 
    updateChunkProgress, 
    initializeChunkProgress, 
    getChunkedProgress, 
    setChunkJobsForParent, 
    addChunkResults, 
    initializeChunkResults, 
    updateParentJobMetadata, 
    toast,
    chunkResults
  ]);

  return {
    createChunkedBatchJob,
    getChunkedProgress,
    isChunkedJob,
    chunkJobs,
    chunkProgress: {}, // Keep for backward compatibility
    parentJobMetadata
  };
};
