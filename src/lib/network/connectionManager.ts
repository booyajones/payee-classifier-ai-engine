import { supabase } from '@/integrations/supabase/client';

interface NetworkStatus {
  isOnline: boolean;
  isConnected: boolean;
  lastConnectionCheck: number;
  consecutiveFailures: number;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

class NetworkConnectionManager {
  private status: NetworkStatus = {
    isOnline: true,
    isConnected: true,
    lastConnectionCheck: 0,
    consecutiveFailures: 0
  };

  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  };

  private circuitBreakerThreshold = 5;
  private circuitBreakerResetTime = 30000; // 30 seconds
  private isCircuitBreakerOpen = false;
  private lastCircuitBreakerReset = 0;

  async checkConnection(): Promise<boolean> {
    const now = Date.now();
    
    // Don't check too frequently
    if (now - this.status.lastConnectionCheck < 5000) {
      return this.status.isConnected;
    }

    try {
      // Simple health check query
      await supabase.from('batch_jobs').select('id').limit(1);
      
      this.status.isConnected = true;
      this.status.consecutiveFailures = 0;
      this.status.lastConnectionCheck = now;
      
      // Reset circuit breaker if we're connected
      if (this.isCircuitBreakerOpen) {
        this.isCircuitBreakerOpen = false;
        console.log('[CONNECTION] Circuit breaker reset - connection restored');
      }
      
      return true;
    } catch (error) {
      this.status.isConnected = false;
      this.status.consecutiveFailures++;
      this.status.lastConnectionCheck = now;
      
      console.warn('[CONNECTION] Connection check failed:', error);
      
      // Trigger circuit breaker if too many failures
      if (this.status.consecutiveFailures >= this.circuitBreakerThreshold) {
        this.isCircuitBreakerOpen = true;
        this.lastCircuitBreakerReset = now;
        console.error('[CONNECTION] Circuit breaker opened due to consecutive failures');
      }
      
      return false;
    }
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>, 
    operationName: string = 'operation'
  ): Promise<T> {
    // Check circuit breaker
    if (this.isCircuitBreakerOpen) {
      const now = Date.now();
      if (now - this.lastCircuitBreakerReset < this.circuitBreakerResetTime) {
        throw new Error(`Circuit breaker is open for ${operationName}`);
      } else {
        // Try to reset circuit breaker
        this.isCircuitBreakerOpen = false;
        console.log('[CONNECTION] Attempting to reset circuit breaker');
      }
    }

    let lastError: Error | null = null;
    let delay = this.retryConfig.baseDelay;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Success - reset failure count
        this.status.consecutiveFailures = 0;
        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`[CONNECTION] ${operationName} attempt ${attempt + 1} failed:`, error);
        
        // Don't retry on certain types of errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        if (attempt < this.retryConfig.maxRetries) {
          // Wait before next attempt
          await this.sleep(delay);
          delay = Math.min(delay * this.retryConfig.backoffMultiplier, this.retryConfig.maxDelay);
        }
      }
    }

    // All retries failed
    this.status.consecutiveFailures++;
    throw lastError || new Error(`${operationName} failed after ${this.retryConfig.maxRetries} retries`);
  }

  private isNonRetryableError(error: any): boolean {
    // Don't retry authentication errors, permission errors, etc.
    const errorMessage = error?.message?.toLowerCase() || '';
    return (
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden') ||
      errorMessage.includes('permission') ||
      errorMessage.includes('invalid api key')
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus(): NetworkStatus {
    return { ...this.status };
  }

  isHealthy(): boolean {
    return this.status.isConnected && !this.isCircuitBreakerOpen;
  }
}

export const connectionManager = new NetworkConnectionManager();