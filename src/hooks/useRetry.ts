
import { useState, useCallback } from 'react';
import { AppError, handleError } from '@/lib/errorHandler';

interface RetryState {
  isRetrying: boolean;
  retryCount: number;
  lastError?: AppError;
  lastSuccessTime?: Date;
}

interface UseRetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  backoffMultiplier?: number;
  maxDelay?: number;
  shouldRetry?: (error: AppError) => boolean;
  onRetry?: (attempt: number, error: AppError) => void;
  onSuccess?: (attempt: number) => void;
  onMaxRetriesReached?: (error: AppError) => void;
}

export const useRetry = <T extends any[], R>(
  asyncFunction: (...args: T) => Promise<R>,
  options: UseRetryOptions = {}
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

  const [retryState, setRetryState] = useState<RetryState>({
    isRetrying: false,
    retryCount: 0
  });

  const executeWithRetry = useCallback(
    async (...args: T): Promise<R> => {
      const attempt = async (attemptNumber: number): Promise<R> => {
        try {
          setRetryState(prev => ({
            ...prev,
            isRetrying: attemptNumber > 0,
            retryCount: attemptNumber
          }));

          const result = await asyncFunction(...args);
          
          // Reset state on success
          setRetryState({
            isRetrying: false,
            retryCount: 0,
            lastSuccessTime: new Date()
          });

          if (onSuccess && attemptNumber > 0) {
            onSuccess(attemptNumber);
          }

          return result;
        } catch (error) {
          const appError = handleError(error, 'Retry operation');
          
          if (attemptNumber < maxRetries && shouldRetry(appError)) {
            console.log(`[RETRY] Attempt ${attemptNumber + 1} failed, retrying...`, {
              error: appError.message,
              nextAttempt: attemptNumber + 2,
              maxRetries: maxRetries + 1
            });
            
            if (onRetry) {
              onRetry(attemptNumber + 1, appError);
            }
            
            // Calculate delay with exponential backoff
            const delay = Math.min(
              baseDelay * Math.pow(backoffMultiplier, attemptNumber),
              maxDelay
            );
            
            await new Promise(resolve => setTimeout(resolve, delay));
            
            return attempt(attemptNumber + 1);
          } else {
            // Max retries reached or error is not retryable
            setRetryState({
              isRetrying: false,
              retryCount: attemptNumber,
              lastError: appError
            });

            if (attemptNumber >= maxRetries && onMaxRetriesReached) {
              onMaxRetriesReached(appError);
            }

            throw appError;
          }
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

  const retry = useCallback((...args: T) => {
    return executeWithRetry(...args);
  }, [executeWithRetry]);

  return {
    execute: executeWithRetry,
    retry,
    reset,
    ...retryState
  };
};

// Specialized hook for batch operations
export const useBatchRetry = <T extends any[], R>(
  batchFunction: (...args: T) => Promise<R>,
  options: UseRetryOptions = {}
) => {
  return useRetry(batchFunction, {
    maxRetries: 2,
    baseDelay: 2000,
    backoffMultiplier: 1.5,
    shouldRetry: (error) => {
      // Don't retry on authentication errors or file validation errors
      return error.retryable && 
             !error.code.includes('AUTHENTICATION') && 
             !error.code.includes('FILE_VALIDATION');
    },
    ...options
  });
};

// Specialized hook for API operations
export const useApiRetry = <T extends any[], R>(
  apiFunction: (...args: T) => Promise<R>,
  options: UseRetryOptions = {}
) => {
  return useRetry(apiFunction, {
    maxRetries: 3,
    baseDelay: 1000,
    backoffMultiplier: 2,
    maxDelay: 10000,
    shouldRetry: (error) => {
      // Retry on network errors, timeouts, and rate limits
      return error.retryable && (
        error.code.includes('NETWORK') ||
        error.code.includes('TIMEOUT') ||
        error.code.includes('RATE_LIMITED')
      );
    },
    ...options
  });
};
