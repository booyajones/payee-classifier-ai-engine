import { productionLogger } from '@/lib/logging/productionLogger';

interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  jitter: boolean;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  jitter: true
};

export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export const isRetryableError = (error: any): boolean => {
  if (error instanceof DatabaseError) {
    return error.isRetryable;
  }
  
  // Common retryable error codes
  const retryableCodes = [
    '08000', // connection_exception
    '08003', // connection_does_not_exist
    '08006', // connection_failure
    '53300', // too_many_connections
    '57P01', // admin_shutdown
    'PGRST301', // Timeout
  ];
  
  // Don't retry unique constraint violations (23505)
  if (error?.code === '23505') {
    return false;
  }
  
  return retryableCodes.includes(error?.code) || 
         error?.message?.includes('timeout') ||
         error?.message?.includes('connection');
};

export const exponentialBackoff = async <T>(
  operation: () => Promise<T>,
  operationName: string,
  options: Partial<RetryOptions> = {}
): Promise<T> => {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        productionLogger.info(`[EXPONENTIAL BACKOFF] Retry attempt ${attempt}/${opts.maxRetries} for ${operationName}`, undefined, 'DATABASE');
      }
      
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on final attempt or non-retryable errors
      if (attempt === opts.maxRetries || !isRetryableError(error)) {
        productionLogger.error(`[EXPONENTIAL BACKOFF] Final failure for ${operationName}`, error, 'DATABASE');
        break;
      }
      
      // Calculate delay with exponential backoff
      const exponentialDelay = Math.min(opts.baseDelay * Math.pow(2, attempt), opts.maxDelay);
      const jitterMultiplier = opts.jitter ? (0.5 + Math.random() * 0.5) : 1;
      const delay = Math.floor(exponentialDelay * jitterMultiplier);
      
      productionLogger.warn(`[EXPONENTIAL BACKOFF] ${operationName} failed (attempt ${attempt + 1}), retrying in ${delay}ms`, error, 'DATABASE');
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new DatabaseError(
    `Operation ${operationName} failed after ${opts.maxRetries} retries: ${lastError.message}`,
    (lastError as any)?.code,
    false
  );
};

export const createCircuitBreaker = (
  failureThreshold: number = 5,
  recoveryTimeout: number = 60000
) => {
  let failures = 0;
  let lastFailureTime = 0;
  let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  return async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    const now = Date.now();
    
    // Check if we should try to recover
    if (state === 'OPEN' && now - lastFailureTime > recoveryTimeout) {
      state = 'HALF_OPEN';
      productionLogger.info(`[CIRCUIT BREAKER] Attempting recovery for ${operationName}`, undefined, 'DATABASE');
    }
    
    // Fail fast if circuit is open
    if (state === 'OPEN') {
      throw new DatabaseError(
        `Circuit breaker is OPEN for ${operationName}. Too many failures detected.`,
        'CIRCUIT_OPEN',
        false
      );
    }
    
    try {
      const result = await operation();
      
      // Reset on success
      if (state === 'HALF_OPEN') {
        state = 'CLOSED';
        failures = 0;
        productionLogger.info(`[CIRCUIT BREAKER] Recovery successful for ${operationName}`, undefined, 'DATABASE');
      }
      
      return result;
    } catch (error) {
      failures++;
      lastFailureTime = now;
      
      if (failures >= failureThreshold) {
        state = 'OPEN';
        productionLogger.error(`[CIRCUIT BREAKER] OPENING circuit for ${operationName} after ${failures} failures`, error, 'DATABASE');
      }
      
      throw error;
    }
  };
};