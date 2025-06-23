
import { useState, useCallback } from 'react';
import { useWebWorkerFileProcessor } from './useWebWorkerFileProcessor';
import { StreamingFileProcessor } from '@/lib/streaming/streamingFileProcessor';
import { intelligentCache } from '@/lib/caching/intelligentCache';
import { usePerformanceMonitoring } from './usePerformanceMonitoring';
import { MemoryOptimizer } from '@/lib/performance/memoryOptimization';
import { useToast } from '@/hooks/use-toast';

export const usePerformanceEnhancedFileUpload = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  
  const { 
    parseFileWithWorker, 
    createMappingsWithWorker, 
    isWorkerAvailable 
  } = useWebWorkerFileProcessor();
  
  const { startOperation, finishOperation } = usePerformanceMonitoring(true);
  const { toast } = useToast();

  const processFileWithPerformanceEnhancements = useCallback(async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    setStage('Initializing...');

    const operationId = startOperation('performance-enhanced-file-upload');

    try {
      // Step 1: Check cache
      setStage('Checking cache...');
      setProgress(5);
      
      const fingerprint = await intelligentCache.generateFileFingerprint(file);
      const cachedResult = await intelligentCache.get(fingerprint);
      
      if (cachedResult) {
        setStage('Using cached result');
        setProgress(100);
        toast({
          title: "Cache Hit!",
          description: "Using previously processed file data",
        });
        finishOperation(operationId);
        return cachedResult;
      }

      // Step 2: Determine processing strategy
      setStage('Analyzing file...');
      setProgress(10);
      
      const fileSize = file.size;
      const memoryStats = MemoryOptimizer.getMemoryStats();
      const shouldUseWorker = isWorkerAvailable && fileSize > 5 * 1024 * 1024; // 5MB
      const shouldUseStreaming = fileSize > 50 * 1024 * 1024; // 50MB

      console.log(`[PERFORMANCE] File processing strategy:`, {
        fileSize: `${(fileSize / 1024 / 1024).toFixed(1)}MB`,
        shouldUseWorker,
        shouldUseStreaming,
        memoryPressure: memoryStats.memoryPressure
      });

      let result;

      if (shouldUseStreaming) {
        // Step 3a: Streaming processing for very large files
        setStage('Streaming large file...');
        setProgress(20);
        
        result = await StreamingFileProcessor.processFileStream(
          file,
          async (chunk) => {
            if (shouldUseWorker) {
              return await createMappingsWithWorker(chunk, 'payee');
            } else {
              // Fallback to main thread
              return chunk.map(item => ({ ...item, processed: true }));
            }
          },
          {
            chunkSize: StreamingFileProcessor.getOptimalChunkSize(
              fileSize, 
              memoryStats.jsHeapSizeLimit
            ),
            onProgress: (streamProgress, streamStage) => {
              setProgress(20 + (streamProgress * 0.7));
              setStage(streamStage);
            }
          }
        );
        
      } else if (shouldUseWorker) {
        // Step 3b: Web Worker processing for medium files
        setStage('Processing with Web Worker...');
        setProgress(30);
        
        const fileData = await parseFileWithWorker(file, (workerProgress) => {
          setProgress(30 + (workerProgress * 0.4));
        });
        
        setStage('Creating mappings...');
        setProgress(70);
        
        result = await createMappingsWithWorker(fileData, 'payee', (workerProgress) => {
          setProgress(70 + (workerProgress * 0.2));
        });
        
      } else {
        // Step 3c: Main thread processing for small files
        setStage('Processing on main thread...');
        setProgress(40);
        
        // Simulate processing (replace with actual logic)
        await new Promise(resolve => setTimeout(resolve, 100));
        result = { message: 'Processed on main thread', size: fileSize };
        setProgress(90);
      }

      // Step 4: Cache the result
      setStage('Caching result...');
      setProgress(95);
      
      await intelligentCache.set(fingerprint, result);

      // Step 5: Complete
      setStage('Complete!');
      setProgress(100);
      
      toast({
        title: "Processing Complete",
        description: `File processed successfully using ${shouldUseStreaming ? 'streaming' : shouldUseWorker ? 'web worker' : 'main thread'} processing`,
      });

      finishOperation(operationId);
      return result;

    } catch (error) {
      console.error('[PERFORMANCE] Processing failed:', error);
      setStage('Error occurred');
      
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
      
      finishOperation(operationId, error instanceof Error ? error.message : 'Unknown error');
      throw error;
      
    } finally {
      setIsProcessing(false);
      
      // Cleanup
      if (progress === 100) {
        setTimeout(() => {
          setProgress(0);
          setStage('');
        }, 2000);
      }
    }
  }, [
    parseFileWithWorker, 
    createMappingsWithWorker, 
    isWorkerAvailable, 
    startOperation, 
    finishOperation, 
    toast
  ]);

  return {
    processFileWithPerformanceEnhancements,
    isProcessing,
    progress,
    stage
  };
};
