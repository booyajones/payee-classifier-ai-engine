
// @ts-nocheck
import { useState, useCallback } from 'react';
import { ChunkJobResult } from '@/lib/fileChunking';
import { PayeeClassification } from '@/lib/types';

export const useChunkJobs = () => {
  const [chunkJobs, setChunkJobs] = useState<Record<string, ChunkJobResult[]>>({});
  const [chunkResults, setChunkResults] = useState<Record<string, PayeeClassification[]>>({});
  const [parentJobMetadata, setParentJobMetadata] = useState<Record<string, { isChunked: boolean; totalChunks: number; completedChunks: number }>>({});

  const addChunkJob = useCallback((parentJobId: string, chunkResult: ChunkJobResult) => {
    setChunkJobs(prevJobs => ({
      ...prevJobs,
      [parentJobId]: [...(prevJobs[parentJobId] || []), chunkResult]
    }));
  }, []);

  const setChunkJobsForParent = useCallback((parentJobId: string, jobs: ChunkJobResult[]) => {
    setChunkJobs(prevJobs => ({ ...prevJobs, [parentJobId]: jobs }));
  }, []);

  const addChunkResults = useCallback((parentJobId: string, results: PayeeClassification[]) => {
    setChunkResults(prevResults => ({
      ...prevResults,
      [parentJobId]: [...(prevResults[parentJobId] || []), ...results]
    }));
  }, []);

  const initializeChunkResults = useCallback((parentJobId: string) => {
    setChunkResults(prevResults => ({ ...prevResults, [parentJobId]: [] }));
  }, []);

  const updateParentJobMetadata = useCallback((parentJobId: string, metadata: { isChunked: boolean; totalChunks: number; completedChunks: number }) => {
    setParentJobMetadata(prev => ({
      ...prev,
      [parentJobId]: metadata
    }));
  }, []);

  const isChunkedJob = useCallback((jobId: string) => {
    return parentJobMetadata[jobId]?.isChunked || false;
  }, [parentJobMetadata]);

  return {
    chunkJobs,
    chunkResults,
    parentJobMetadata,
    addChunkJob,
    setChunkJobsForParent,
    addChunkResults,
    initializeChunkResults,
    updateParentJobMetadata,
    isChunkedJob
  };
};
