
import { useState, useCallback } from 'react';
import { MemoryOptimizer } from '@/lib/performance/memoryOptimization';
import { usePerformanceMonitoring } from './usePerformanceMonitoring';
import { handleError, showErrorToast } from '@/lib/errorHandler';
import { useToast } from '@/hooks/use-toast';

interface MemoryAwareProcessingOptions {
  enableMonitoring?: boolean;
  maxChunkSize?: number;
  memoryThreshold?: number;
}

export const useMemoryAwareFileProcessor = (options: MemoryAwareProcessingOptions = {}) => {
  const { enableMonitoring = true, maxChunkSize = 1000, memoryThreshold = 0.8 } = options;
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const { startOperation, finishOperation } = usePerformanceMonitoring(enableMonitoring);
  const { toast } = useToast();

  const processWithMemoryManagement = useCallback(async <T, R>(
    data: T[],
    processor: (chunk: T[]) => Promise<R[]>,
    operationName: string = 'memory-aware-processing'
  ): Promise<R[]> => {
    if (data.length === 0) return [];

    setIsProcessing(true);
    setProcessingProgress(0);

    const monitor = MemoryOptimizer.createMemoryMonitor(operationName);
    const operationId = startOperation(operationName);

    try {
      // Calculate optimal chunk size based on memory pressure
      const optimalChunkSize = MemoryOptimizer.getOptimalChunkSize(
        JSON.stringify(data).length,
        maxChunkSize
      );

      console.log(`[MEMORY PROCESSOR] Processing ${data.length} items in chunks of ${optimalChunkSize}`);
      monitor.checkpoint('chunk-size-calculated');

      const chunks: T[][] = [];
      for (let i = 0; i < data.length; i += optimalChunkSize) {
        chunks.push(data.slice(i, i + optimalChunkSize));
      }

      const results: R[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        // Check memory pressure before each chunk
        const memoryStats = MemoryOptimizer.getMemoryStats();
        if (memoryStats.memoryPressure === 'high') {
          console.warn(`[MEMORY PROCESSOR] High memory pressure detected, pausing...`);
          
          // Force garbage collection and wait
          MemoryOptimizer.suggestGarbageCollection();
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check again
          const newStats = MemoryOptimizer.getMemoryStats();
          if (newStats.memoryPressure === 'high') {
            throw new Error('Memory pressure too high to continue processing. Please close other tabs and try again.');
          }
        }

        try {
          const chunkResults = await processor(chunks[i]);
          results.push(...chunkResults);
          
          const progress = ((i + 1) / chunks.length) * 100;
          setProcessingProgress(progress);
          
          monitor.checkpoint(`chunk-${i + 1}-completed`);
          
          // Small delay to prevent UI blocking
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
          
        } catch (error) {
          console.error(`[MEMORY PROCESSOR] Chunk ${i + 1} failed:`, error);
          const appError = handleError(error, `Chunk ${i + 1} Processing`);
          
          if (results.length > 0) {
            // Partial success - return what we have
            toast({
              title: "Partial Processing Complete",
              description: `Processed ${results.length} items. Chunk ${i + 1} failed: ${appError.message}`,
              variant: "destructive",
            });
            break;
          } else {
            throw appError;
          }
        }
      }

      monitor.finish();
      finishOperation(operationId);
      
      console.log(`[MEMORY PROCESSOR] Successfully processed ${results.length} items`);
      return results;

    } catch (error) {
      const appError = handleError(error, operationName);
      showErrorToast(appError, 'Memory-Aware Processing');
      finishOperation(operationId, appError.message);
      throw appError;
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
      
      // Final cleanup
      MemoryOptimizer.suggestGarbageCollection();
    }
  }, [maxChunkSize, memoryThreshold, startOperation, finishOperation, toast]);

  const getMemoryStatus = useCallback(() => {
    return MemoryOptimizer.getMemoryStats();
  }, []);

  return {
    processWithMemoryManagement,
    isProcessing,
    processingProgress,
    getMemoryStatus
  };
};
