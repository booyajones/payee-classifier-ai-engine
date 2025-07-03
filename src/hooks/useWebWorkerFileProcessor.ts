
import { useCallback, useRef } from 'react';
import { WorkerMessage, WorkerResponse } from '@/lib/workers/fileProcessingWorker';
import { useToast } from '@/hooks/use-toast';

export const useWebWorkerFileProcessor = () => {
  const workerRef = useRef<Worker | null>(null);
  const taskCallbacks = useRef<Map<string, { resolve: (data: any) => void; reject: (error: Error) => void; onProgress?: (progress: number) => void }>>(new Map());
  const { toast } = useToast();

  const initializeWorker = useCallback(() => {
    if (workerRef.current) return;

    try {
      workerRef.current = new Worker(
        new URL('../lib/workers/fileProcessingWorker.ts', import.meta.url),
        { type: 'module' }
      );

      workerRef.current.onmessage = (event) => {
        const response = event.data as WorkerResponse;
        const callback = taskCallbacks.current.get(response.taskId);

        if (!callback) return;

        switch (response.type) {
          case 'PROGRESS':
            callback.onProgress?.(response.progress || 0);
            break;
          
          case 'SUCCESS':
            taskCallbacks.current.delete(response.taskId);
            callback.resolve(response.data);
            break;
          
          case 'ERROR':
            taskCallbacks.current.delete(response.taskId);
            callback.reject(new Error(response.error || 'Worker error'));
            break;
        }
      };

      workerRef.current.onerror = (error) => {
        productionLogger.error('[WEB WORKER] Error:', error);
        toast({
          title: "Processing Error",
          description: "Background processing encountered an error",
          variant: "destructive",
        });
      };

    } catch (error) {
      productionLogger.error('[WEB WORKER] Failed to initialize:', error);
      toast({
        title: "Worker Initialization Failed",
        description: "Falling back to main thread processing",
        variant: "destructive",
      });
    }
  }, [toast]);

  const processWithWorker = useCallback(async <T>(
    type: 'PARSE_FILE' | 'CREATE_MAPPINGS' | 'PROCESS_CHUNK',
    payload: any,
    onProgress?: (progress: number) => void
  ): Promise<T> => {
    initializeWorker();

    if (!workerRef.current) {
      throw new Error('Worker not available');
    }

    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return new Promise((resolve, reject) => {
      taskCallbacks.current.set(taskId, { resolve, reject, onProgress });

      const message: WorkerMessage = {
        type,
        payload,
        taskId
      };

      workerRef.current!.postMessage(message);
    });
  }, [initializeWorker]);

  const parseFileWithWorker = useCallback(async (
    file: File,
    onProgress?: (progress: number) => void
  ) => {
    return processWithWorker('PARSE_FILE', { file }, onProgress);
  }, [processWithWorker]);

  const createMappingsWithWorker = useCallback(async (
    fileData: any[],
    column: string,
    onProgress?: (progress: number) => void
  ) => {
    return processWithWorker('CREATE_MAPPINGS', { fileData, column }, onProgress);
  }, [processWithWorker]);

  const processChunkWithWorker = useCallback(async (
    chunk: any[],
    processor: string,
    onProgress?: (progress: number) => void
  ) => {
    return processWithWorker('PROCESS_CHUNK', { chunk, processor }, onProgress);
  }, [processWithWorker]);

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      taskCallbacks.current.clear();
    }
  }, []);

  return {
    parseFileWithWorker,
    createMappingsWithWorker,
    processChunkWithWorker,
    terminateWorker,
    isWorkerAvailable: !!workerRef.current
  };
};
