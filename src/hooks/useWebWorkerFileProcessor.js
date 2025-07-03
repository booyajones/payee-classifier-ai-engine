import { useState, useCallback, useRef, useEffect } from 'react';

export const useWebWorkerFileProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const workerRef = useRef(null);

  const initializeWorker = useCallback(() => {
    if (!workerRef.current) {
      try {
        workerRef.current = new Worker('/src/workers/fileProcessingWorker.ts', { type: 'module' });
        
        workerRef.current.onmessage = (event) => {
          const { type, payload } = event.data;
          
          switch (type) {
            case 'progress':
              setProgress(payload.progress);
              break;
            case 'complete':
              setIsProcessing(false);
              setProgress(100);
              break;
            case 'error':
              setIsProcessing(false);
              setError(payload.error);
              break;
          }
        };

        workerRef.current.onerror = (error) => {
          productionLogger.error('[WEB WORKER] Worker error:', error);
          setIsProcessing(false);
          setError('Worker failed to process file');
        };
      } catch (error) {
        productionLogger.error('[WEB WORKER] Failed to initialize worker:', error);
        setError('Failed to initialize file processor');
      }
    }
  }, []);

  const processFile = useCallback((file, options = {}) => {
    initializeWorker();
    
    if (!workerRef.current) {
      setError('File processor not available');
      return Promise.reject(new Error('File processor not available'));
    }

    return new Promise((resolve, reject) => {
      setIsProcessing(true);
      setProgress(0);
      setError(null);

      const handleMessage = (event) => {
        const { type, payload } = event.data;
        
        if (type === 'complete') {
          workerRef.current.removeEventListener('message', handleMessage);
          resolve(payload.result);
        } else if (type === 'error') {
          workerRef.current.removeEventListener('message', handleMessage);
          reject(new Error(payload.error));
        }
      };

      workerRef.current.addEventListener('message', handleMessage);
      workerRef.current.postMessage({
        type: 'process',
        payload: { file, options }
      });
    });
  }, [initializeWorker]);

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsProcessing(false);
    setProgress(0);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      terminateWorker();
    };
  }, [terminateWorker]);

  return {
    isProcessing,
    progress,
    error,
    processFile,
    terminateWorker
  };
};