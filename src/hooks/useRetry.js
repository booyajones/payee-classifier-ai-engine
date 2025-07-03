import { useState, useCallback } from 'react';
import { handleError } from '@/lib/errorHandler';

export const useRetry = (
  asyncFunction,
  options = {}
) => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    backoffMultiplier = 2,
    maxDelay = 30000,
    shouldRetry = (error) => error.retryable !== false,
    onRetry,
    onSuccess,
    onMaxRetriesReached
  } = options;

  const [retryState, setRetryState] = useState({
    isRetrying: false,
    retryCount: 0
  });

  const executeWithRetry = useCallback(
    async (...args) => {
      const attempt = async (attemptNumber) => {
        try {
          setRetryState(prev => ({
            ...prev,
            isRetrying: attemptNumber > 0,
            retryCount: attemptNumber
          }));

          const result = await asyncFunction(...args);
          
          if (attemptNumber > 0 && onSuccess) {
            onSuccess(attemptNumber);
          }
          
          setRetryState(prev => ({
            ...prev,
            isRetrying: false,
            lastSuccessTime: new Date()
          }));
          
          return result;
        } catch (error) {
          productionLogger.debug(`[RETRY] Attempt ${attemptNumber + 1} failed:`, error);
          
          const appError = handleError(error, 'Retry Attempt');
          
          setRetryState(prev => ({
            ...prev,
            lastError: appError,
            retryCount: attemptNumber
          }));

          if (attemptNumber >= maxRetries) {
            setRetryState(prev => ({ ...prev, isRetrying: false }));
            if (onMaxRetriesReached) {
              onMaxRetriesReached(appError);
            }
            throw appError;
          }

          if (!shouldRetry(appError)) {
            setRetryState(prev => ({ ...prev, isRetrying: false }));
            throw appError;
          }

          if (onRetry) {
            onRetry(attemptNumber + 1, appError);
          }

          const delay = Math.min(
            baseDelay * Math.pow(backoffMultiplier, attemptNumber),
            maxDelay
          );
          
          productionLogger.debug(`[RETRY] Waiting ${delay}ms before retry ${attemptNumber + 2}/${maxRetries + 1}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          return attempt(attemptNumber + 1);
        }
      };

      return attempt(0);
    },
    [asyncFunction, maxRetries, baseDelay, backoffMultiplier, maxDelay, shouldRetry, onRetry, onSuccess, onMaxRetriesReached]
  );

  const reset = useCallback(() => {
    setRetryState({
      isRetrying: false,
      retryCount: 0
    });
  }, []);

  return {
    execute: executeWithRetry,
    reset,
    state: retryState,
    isRetrying: retryState.isRetrying,
    retryCount: retryState.retryCount,
    lastError: retryState.lastError,
    lastSuccessTime: retryState.lastSuccessTime
  };
};

export const useApiRetry = (apiFunction, options = {}) => {
  const defaultOptions = {
    maxRetries: 3,
    baseDelay: 1000,
    shouldRetry: (error) => {
      if (!error) return false;
      
      const isNetworkError = error.message?.includes('fetch') || 
                            error.message?.includes('network') ||
                            error.message?.includes('timeout') ||
                            error.code === 'NETWORK_ERROR';
      
      const isRetryableHttpError = error.status >= 500 || 
                                  error.status === 429 || 
                                  error.status === 408;
      
      const retryable = isNetworkError || isRetryableHttpError;
      productionLogger.debug(`[API RETRY] Error retryable: ${retryable}`, { 
        error: error.message, 
        status: error.status,
        isNetworkError,
        isRetryableHttpError
      });
      
      return retryable;
    },
    ...options
  };

  return useRetry(apiFunction, defaultOptions);
};

export const useResilientApiCall = (apiFunction, options = {}) => {
  const defaultOptions = {
    maxRetries: 2,
    baseDelay: 500,
    shouldRetry: (error) => {
      const shouldRetry = error?.retryable !== false && 
                         (error?.status >= 500 || error?.status === 429);
      return shouldRetry;
    },
    ...options
  };

  return useRetry(apiFunction, defaultOptions);
};