
import { timeoutPromise } from './utils';

interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isTimeout: boolean = false
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Enhanced API request wrapper with timeout, retries, and error handling
 */
export async function makeAPIRequest<T>(
  requestFn: () => Promise<T>,
  config: RequestConfig = {}
): Promise<T> {
  const {
    timeout = 30000, // 30 second default timeout
    retries = 2,
    retryDelay = 1000
  } = config;

  let lastError: Error;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`[API] Attempt ${attempt + 1}/${retries + 1}`);
      
      const result = await timeoutPromise(requestFn(), timeout);
      
      if (attempt > 0) {
        console.log(`[API] Request succeeded after ${attempt + 1} attempts`);
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      
      if (lastError.message.includes('timed out')) {
        console.error(`[API] Request timed out after ${timeout}ms (attempt ${attempt + 1})`);
        lastError = new APIError(`Request timed out after ${timeout}ms`, undefined, true);
      } else {
        console.error(`[API] Request failed on attempt ${attempt + 1}:`, error);
      }

      // Don't retry on the last attempt
      if (attempt < retries) {
        const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
        console.log(`[API] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Check if the server is healthy
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    // Simple health check - try to make a minimal API call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('/api/health', {
      signal: controller.signal,
      method: 'HEAD'
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error('[API] Server health check failed:', error);
    return false;
  }
}

/**
 * Memory usage monitor
 */
export function getMemoryUsage(): { used: number; limit: number; percentage: number } {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
    };
  }
  
  return { used: 0, limit: 0, percentage: 0 };
}

/**
 * Log memory usage with warnings
 */
export function logMemoryUsage(context: string): void {
  const memory = getMemoryUsage();
  
  if (memory.percentage > 80) {
    console.warn(`[MEMORY] High memory usage in ${context}: ${memory.percentage.toFixed(1)}%`);
  } else if (memory.percentage > 0) {
    console.log(`[MEMORY] Memory usage in ${context}: ${memory.percentage.toFixed(1)}%`);
  }
}
