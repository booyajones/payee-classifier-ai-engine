
/**
 * Memory optimization utilities for large file processing
 */

export interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  memoryPressure: 'low' | 'medium' | 'high';
}

export class MemoryOptimizer {
  private static readonly MEMORY_WARNING_THRESHOLD = 0.7; // 70% of heap limit
  private static readonly MEMORY_CRITICAL_THRESHOLD = 0.9; // 90% of heap limit
  
  /**
   * Get current memory usage statistics
   */
  static getMemoryStats(): MemoryStats {
    const performance = (window as any).performance;
    const memory = performance?.memory;
    
    if (!memory) {
      return {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
        memoryPressure: 'low'
      };
    }
    
    const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    let memoryPressure: 'low' | 'medium' | 'high' = 'low';
    
    if (usageRatio > this.MEMORY_CRITICAL_THRESHOLD) {
      memoryPressure = 'high';
    } else if (usageRatio > this.MEMORY_WARNING_THRESHOLD) {
      memoryPressure = 'medium';
    }
    
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      memoryPressure
    };
  }
  
  /**
   * Check if memory usage is approaching limits
   */
  static isMemoryPressureHigh(): boolean {
    const stats = this.getMemoryStats();
    return stats.memoryPressure === 'high';
  }
  
  /**
   * Suggest garbage collection if available
   */
  static suggestGarbageCollection(): void {
    if (this.isMemoryPressureHigh() && (window as any).gc) {
      console.log('[MEMORY] Suggesting garbage collection due to high memory pressure');
      try {
        (window as any).gc();
      } catch (error) {
        console.warn('[MEMORY] Manual GC not available:', error);
      }
    }
  }
  
  /**
   * Calculate optimal chunk size based on available memory
   */
  static getOptimalChunkSize(dataSize: number, defaultChunkSize: number = 1000): number {
    const stats = this.getMemoryStats();
    const availableMemory = stats.jsHeapSizeLimit - stats.usedJSHeapSize;
    const estimatedMemoryPerItem = dataSize / 1000; // Rough estimate
    
    if (stats.memoryPressure === 'high') {
      return Math.min(defaultChunkSize * 0.5, 500);
    } else if (stats.memoryPressure === 'medium') {
      return Math.min(defaultChunkSize * 0.75, 750);
    }
    
    // Calculate based on available memory
    const optimalSize = Math.floor(availableMemory / (estimatedMemoryPerItem * 10));
    return Math.max(100, Math.min(optimalSize, defaultChunkSize * 2));
  }
  
  /**
   * Clean up large objects and arrays
   */
  static cleanupLargeObjects(...objects: any[]): void {
    objects.forEach(obj => {
      if (obj && typeof obj === 'object') {
        if (Array.isArray(obj)) {
          obj.length = 0;
        } else {
          Object.keys(obj).forEach(key => {
            delete obj[key];
          });
        }
      }
    });
    
    this.suggestGarbageCollection();
  }
  
  /**
   * Monitor memory usage during operations
   */
  static createMemoryMonitor(operationName: string) {
    const startStats = this.getMemoryStats();
    console.log(`[MEMORY] ${operationName} started - Memory usage: ${(startStats.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
    
    return {
      checkpoint: (checkpointName: string) => {
        const currentStats = this.getMemoryStats();
        const memoryDiff = currentStats.usedJSHeapSize - startStats.usedJSHeapSize;
        console.log(`[MEMORY] ${operationName} - ${checkpointName}: +${(memoryDiff / 1024 / 1024).toFixed(2)}MB (${currentStats.memoryPressure} pressure)`);
        
        if (currentStats.memoryPressure === 'high') {
          console.warn(`[MEMORY] High memory pressure detected during ${operationName}`);
        }
      },
      
      finish: () => {
        const endStats = this.getMemoryStats();
        const totalMemoryDiff = endStats.usedJSHeapSize - startStats.usedJSHeapSize;
        console.log(`[MEMORY] ${operationName} completed - Total memory change: ${(totalMemoryDiff / 1024 / 1024).toFixed(2)}MB`);
        
        this.suggestGarbageCollection();
      }
    };
  }
}

/**
 * React hook for monitoring memory usage
 */
export const useMemoryMonitor = (enabled: boolean = false) => {
  const [memoryStats, setMemoryStats] = React.useState<MemoryStats | null>(null);
  
  React.useEffect(() => {
    if (!enabled) return;
    
    const updateStats = () => {
      setMemoryStats(MemoryOptimizer.getMemoryStats());
    };
    
    updateStats();
    const interval = setInterval(updateStats, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, [enabled]);
  
  return memoryStats;
};
