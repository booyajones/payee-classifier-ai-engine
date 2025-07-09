/**
 * MEMORY LEAK PREVENTION UTILITIES
 * Phase 4: Advanced memory management and leak detection
 */

interface AsyncOperation {
  id: string;
  type: 'timer' | 'interval' | 'fetch' | 'websocket' | 'eventListener';
  cleanup: () => void;
  created: number;
}

class MemoryLeakPreventer {
  private operations = new Map<string, AsyncOperation>();
  private cleanupHandlers = new Set<() => void>();
  private isDestroyed = false;

  // Register an async operation for cleanup tracking
  registerOperation(
    id: string,
    type: AsyncOperation['type'],
    cleanup: () => void
  ): void {
    if (this.isDestroyed) {
      console.warn('[MEMORY LEAK PREVENTION] Attempted to register operation after destruction');
      cleanup(); // Immediate cleanup
      return;
    }

    // Clean up existing operation with same ID
    this.unregisterOperation(id);

    this.operations.set(id, {
      id,
      type,
      cleanup,
      created: Date.now()
    });
  }

  // Unregister and cleanup an operation
  unregisterOperation(id: string): void {
    const operation = this.operations.get(id);
    if (operation) {
      try {
        operation.cleanup();
      } catch (error) {
        console.warn(`[MEMORY LEAK PREVENTION] Cleanup failed for ${id}:`, error);
      }
      this.operations.delete(id);
    }
  }

  // Register a general cleanup handler
  registerCleanup(cleanup: () => void): void {
    this.cleanupHandlers.add(cleanup);
  }

  // Cleanup operations older than specified time
  cleanupOldOperations(maxAge: number = 5 * 60 * 1000): void {
    const now = Date.now();
    const toCleanup: string[] = [];

    for (const [id, operation] of this.operations) {
      if (now - operation.created > maxAge) {
        toCleanup.push(id);
      }
    }

    toCleanup.forEach(id => this.unregisterOperation(id));
    
    if (toCleanup.length > 0) {
      console.log(`[MEMORY LEAK PREVENTION] Cleaned up ${toCleanup.length} old operations`);
    }
  }

  // Force cleanup all operations
  forceCleanupAll(): void {
    console.log(`[MEMORY LEAK PREVENTION] Force cleaning up ${this.operations.size} operations`);
    
    for (const operation of this.operations.values()) {
      try {
        operation.cleanup();
      } catch (error) {
        console.warn(`[MEMORY LEAK PREVENTION] Force cleanup failed:`, error);
      }
    }
    
    this.operations.clear();

    // Execute general cleanup handlers
    for (const cleanup of this.cleanupHandlers) {
      try {
        cleanup();
      } catch (error) {
        console.warn('[MEMORY LEAK PREVENTION] General cleanup failed:', error);
      }
    }
    
    this.cleanupHandlers.clear();
  }

  // Get operation statistics
  getStats(): { total: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    
    for (const operation of this.operations.values()) {
      byType[operation.type] = (byType[operation.type] || 0) + 1;
    }

    return {
      total: this.operations.size,
      byType
    };
  }

  // Destroy the preventer and cleanup everything
  destroy(): void {
    this.isDestroyed = true;
    this.forceCleanupAll();
  }
}

// Global instance for the application
export const memoryLeakPreventer = new MemoryLeakPreventer();

// Utility functions for common operations
export const trackTimeout = (callback: () => void, delay: number): NodeJS.Timeout => {
  const id = Math.random().toString(36);
  const timeoutId = setTimeout(callback, delay);
  
  memoryLeakPreventer.registerOperation(id, 'timer', () => {
    clearTimeout(timeoutId);
  });
  
  return timeoutId;
};

export const trackInterval = (callback: () => void, delay: number): NodeJS.Timeout => {
  const id = Math.random().toString(36);
  const intervalId = setInterval(callback, delay);
  
  memoryLeakPreventer.registerOperation(id, 'interval', () => {
    clearInterval(intervalId);
  });
  
  return intervalId;
};

export const trackFetch = (fetchPromise: Promise<any>): Promise<any> => {
  const id = Math.random().toString(36);
  const controller = new AbortController();
  
  memoryLeakPreventer.registerOperation(id, 'fetch', () => {
    controller.abort();
  });
  
  return fetchPromise.finally(() => {
    memoryLeakPreventer.unregisterOperation(id);
  });
};

export const trackEventListener = (
  element: EventTarget,
  event: string,
  listener: EventListener,
  options?: boolean | AddEventListenerOptions
): void => {
  const id = `${event}_${Math.random().toString(36)}`;
  
  element.addEventListener(event, listener, options);
  
  memoryLeakPreventer.registerOperation(id, 'eventListener', () => {
    element.removeEventListener(event, listener, options);
  });
};

// Automatic cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    memoryLeakPreventer.destroy();
  });
  
  // Periodic cleanup of old operations
  trackInterval(() => {
    memoryLeakPreventer.cleanupOldOperations();
  }, 2 * 60 * 1000); // Every 2 minutes
}