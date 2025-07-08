import { supabase } from '@/integrations/supabase/client';
import { productionLogger } from '@/lib/logging/productionLogger';

/**
 * PHASE 3: Database connection optimization with retry logic
 */
class DatabaseConnectionManager {
  private retryQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private lastConnectionCheck = 0;
  private readonly CONNECTION_CHECK_INTERVAL = 30000; // 30 seconds

  // PHASE 3: Exponential backoff retry logic
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        if (attempt === maxRetries) {
          productionLogger.error(`Database operation failed after ${maxRetries} attempts`, error, 'DATABASE_CONNECTION');
          throw error;
        }

        const isNetworkError = error.message?.includes('fetch') || 
                              error.message?.includes('network') ||
                              error.message?.includes('timeout');

        if (!isNetworkError) {
          throw error; // Don't retry non-network errors
        }

        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        productionLogger.warn(`Database operation failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`, 
                             { error: error.message }, 'DATABASE_CONNECTION');
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('This should never be reached');
  }

  // PHASE 3: Connection health check
  async checkConnection(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastConnectionCheck < this.CONNECTION_CHECK_INTERVAL) {
      return true; // Assume connection is OK if checked recently
    }

    try {
      const { error } = await supabase.from('batch_jobs').select('id').limit(1);
      this.lastConnectionCheck = now;
      
      if (error) {
        productionLogger.warn('Database connection check failed', error, 'DATABASE_CONNECTION');
        return false;
      }
      
      return true;
    } catch (error) {
      productionLogger.error('Database connection check error', error, 'DATABASE_CONNECTION');
      this.lastConnectionCheck = now;
      return false;
    }
  }

  // PHASE 3: Queue operations when connection is poor
  async queueOperation<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.retryQueue.push(async () => {
        try {
          const result = await this.executeWithRetry(operation);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  // PHASE 3: Process queued operations
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.retryQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.retryQueue.length > 0) {
        const operation = this.retryQueue.shift();
        if (operation) {
          await operation();
          // Small delay between operations to prevent overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      productionLogger.error('Queue processing failed', error, 'DATABASE_CONNECTION');
    } finally {
      this.isProcessingQueue = false;
    }
  }

  // PHASE 3: Throttled database operations
  async throttledOperation<T>(
    operation: () => Promise<T>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T> {
    const isHealthy = await this.checkConnection();
    
    if (!isHealthy && priority === 'low') {
      throw new Error('Database connection unhealthy, skipping low priority operation');
    }

    if (!isHealthy) {
      return this.queueOperation(operation);
    }

    return this.executeWithRetry(operation);
  }
}

// Global connection manager instance
export const databaseConnectionManager = new DatabaseConnectionManager();

// PHASE 3: Helper function for easy usage
export const withDatabaseRetry = <T>(
  operation: () => Promise<T>,
  priority: 'high' | 'medium' | 'low' = 'medium'
): Promise<T> => {
  return databaseConnectionManager.throttledOperation(operation, priority);
};