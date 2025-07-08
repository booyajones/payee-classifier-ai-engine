
/**
 * Helper function to create a promise that rejects after a timeout with cancellation support
 */
export function timeoutPromise<T>(promise: Promise<T>, ms: number, abortController?: AbortController): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      if (abortController) {
        abortController.abort();
      }
      reject(new Error(`Request timed out after ${ms}ms`));
    }, ms);
  });
  
  // Handle abort signal
  if (abortController?.signal) {
    abortController.signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
    });
  }
  
  return Promise.race([
    promise,
    timeoutPromise
  ]).then(
    result => {
      clearTimeout(timeoutId);
      return result as T;
    },
    error => {
      clearTimeout(timeoutId);
      throw error;
    }
  );
}

/**
 * Enhanced timeout wrapper with cancellation for refresh operations
 */
export function withRefreshTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number = 15000
): { promise: Promise<T>; cancel: () => void } {
  const abortController = new AbortController();
  
  const wrappedPromise = timeoutPromise(promise, timeoutMs, abortController)
    .catch(error => {
      if (abortController.signal.aborted) {
        throw new Error('Request was cancelled');
      }
      throw error;
    });
  
  return {
    promise: wrappedPromise,
    cancel: () => abortController.abort()
  };
}
