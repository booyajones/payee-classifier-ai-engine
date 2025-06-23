
import { useState, useCallback } from 'react';
import { calculateChunkedProgress } from '@/lib/fileChunking';

export const useChunkProgress = () => {
  const [chunkProgress, setChunkProgress] = useState<Record<string, Record<string, { current: number; total: number; status: string }>>>({});

  const updateChunkProgress = useCallback((parentJobId: string, chunkJobId: string, current: number, total: number, status: string) => {
    setChunkProgress(prevProgress => {
      const updatedProgress = { ...prevProgress[parentJobId] };
      updatedProgress[chunkJobId] = { current, total, status };
      return { ...prevProgress, [parentJobId]: updatedProgress };
    });
  }, []);

  const initializeChunkProgress = useCallback((parentJobId: string) => {
    setChunkProgress(prevProgress => ({ ...prevProgress, [parentJobId]: {} }));
  }, []);

  const getChunkedProgress = useCallback((jobId: string) => {
    const progress = chunkProgress[jobId] || {};
    return calculateChunkedProgress(progress);
  }, [chunkProgress]);

  return {
    chunkProgress,
    updateChunkProgress,
    initializeChunkProgress,
    getChunkedProgress
  };
};
