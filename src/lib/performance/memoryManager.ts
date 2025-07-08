/**
 * EMERGENCY MEMORY MANAGER
 * Implements aggressive memory management and cleanup strategies
 */

class MemoryManager {
  private cleanupCallbacks: Set<() => void> = new Set();
  private isCleanupRunning = false;
  private lastCleanup = 0;

  // Register cleanup callback
  registerCleanup(callback: () => void): () => void {
    this.cleanupCallbacks.add(callback);
    return () => this.cleanupCallbacks.delete(callback);
  }

  // Force immediate cleanup
  async forceCleanup(): Promise<void> {
    if (this.isCleanupRunning) {
      console.warn('[MEMORY MANAGER] Cleanup already running, skipping');
      return;
    }

    this.isCleanupRunning = true;
    this.lastCleanup = Date.now();

    try {
      console.log('[MEMORY MANAGER] Starting emergency cleanup');

      // Execute all registered cleanup callbacks
      for (const callback of this.cleanupCallbacks) {
        try {
          callback();
        } catch (error) {
          console.error('[MEMORY MANAGER] Cleanup callback failed:', error);
        }
      }

      // Clear browser caches
      this.clearBrowserCaches();

      // Force garbage collection if available
      this.forceGarbageCollection();

      console.log('[MEMORY MANAGER] Emergency cleanup completed');
    } finally {
      this.isCleanupRunning = false;
    }
  }

  // Check if cleanup is needed
  shouldCleanup(): boolean {
    const timeSinceLastCleanup = Date.now() - this.lastCleanup;
    return timeSinceLastCleanup > 5 * 60 * 1000; // 5 minutes
  }

  // Get memory usage info
  getMemoryInfo(): { usage?: number; limit?: number; percentage?: number } {
    if (typeof window === 'undefined') return {};

    try {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usage = memory.usedJSHeapSize;
        const limit = memory.jsHeapSizeLimit;
        const percentage = Math.round((usage / limit) * 100);

        return { usage, limit, percentage };
      }
    } catch (error) {
      console.warn('[MEMORY MANAGER] Memory info unavailable:', error);
    }

    return {};
  }

  // Clear browser caches
  private clearBrowserCaches(): void {
    if (typeof window === 'undefined') return;

    try {
      // Clear localStorage items related to our app
      Object.keys(localStorage).forEach(key => {
        if (key.includes('batch') || 
            key.includes('job') || 
            key.includes('polling') || 
            key.includes('cache') ||
            key.includes('payee')) {
          localStorage.removeItem(key);
        }
      });

      // Clear sessionStorage
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes('batch') || 
            key.includes('job') || 
            key.includes('polling') || 
            key.includes('cache')) {
          sessionStorage.removeItem(key);
        }
      });

      console.log('[MEMORY MANAGER] Browser caches cleared');
    } catch (error) {
      console.warn('[MEMORY MANAGER] Cache cleanup failed:', error);
    }
  }

  // Force garbage collection if available
  private forceGarbageCollection(): void {
    try {
      if (typeof window !== 'undefined' && 'gc' in window) {
        (window as any).gc();
        console.log('[MEMORY MANAGER] Forced garbage collection');
      }
    } catch (error) {
      console.warn('[MEMORY MANAGER] GC not available:', error);
    }
  }

  // Monitor memory usage
  startMonitoring(thresholdPercentage: number = 80): () => void {
    const checkMemory = () => {
      const { percentage } = this.getMemoryInfo();
      
      if (percentage && percentage > thresholdPercentage) {
        console.warn(`[MEMORY MANAGER] High memory usage: ${percentage}%`);
        
        if (percentage > 90) {
          console.error('[MEMORY MANAGER] Critical memory usage, forcing cleanup');
          this.forceCleanup();
        }
      }
    };

    const interval = setInterval(checkMemory, 10000); // Check every 10 seconds
    
    return () => {
      clearInterval(interval);
    };
  }
}

// Global memory manager instance
export const memoryManager = new MemoryManager();

// Hook for easy integration
export const useMemoryManager = () => {
  return {
    forceCleanup: () => memoryManager.forceCleanup(),
    getMemoryInfo: () => memoryManager.getMemoryInfo(),
    registerCleanup: (callback: () => void) => memoryManager.registerCleanup(callback),
    startMonitoring: (threshold?: number) => memoryManager.startMonitoring(threshold)
  };
};