/**
 * Centralized cleanup manager for memory leak prevention
 */
import React from 'react';

interface CleanupItem {
  id: string;
  cleanup: () => void;
  type: 'timeout' | 'interval' | 'subscription' | 'listener';
}

class CleanupManager {
  private static instance: CleanupManager;
  private cleanupItems: Map<string, CleanupItem> = new Map();

  static getInstance(): CleanupManager {
    if (!CleanupManager.instance) {
      CleanupManager.instance = new CleanupManager();
    }
    return CleanupManager.instance;
  }

  addTimeout(id: string, timeoutId: NodeJS.Timeout) {
    this.cleanupItems.set(id, {
      id,
      cleanup: () => clearTimeout(timeoutId),
      type: 'timeout'
    });
  }

  addInterval(id: string, intervalId: NodeJS.Timeout) {
    this.cleanupItems.set(id, {
      id,
      cleanup: () => clearInterval(intervalId),
      type: 'interval'
    });
  }

  addSubscription(id: string, unsubscribe: () => void) {
    this.cleanupItems.set(id, {
      id,
      cleanup: unsubscribe,
      type: 'subscription'
    });
  }

  addListener(id: string, removeListener: () => void) {
    this.cleanupItems.set(id, {
      id,
      cleanup: removeListener,
      type: 'listener'
    });
  }

  cleanup(id: string) {
    const item = this.cleanupItems.get(id);
    if (item) {
      item.cleanup();
      this.cleanupItems.delete(id);
    }
  }

  cleanupAll() {
    for (const item of this.cleanupItems.values()) {
      item.cleanup();
    }
    this.cleanupItems.clear();
  }

  cleanupByType(type: CleanupItem['type']) {
    for (const [id, item] of this.cleanupItems.entries()) {
      if (item.type === type) {
        item.cleanup();
        this.cleanupItems.delete(id);
      }
    }
  }

  getActiveCleanups(): CleanupItem[] {
    return Array.from(this.cleanupItems.values());
  }
}

export const cleanupManager = CleanupManager.getInstance();

// Hook for React components

export const useCleanup = () => {
  const cleanupRef = React.useRef<string[]>([]);

  React.useEffect(() => {
    return () => {
      // Cleanup all registered items for this component
      cleanupRef.current.forEach(id => cleanupManager.cleanup(id));
    };
  }, []);

  const addCleanup = (id: string, cleanup: () => void, type: CleanupItem['type'] = 'subscription') => {
    cleanupRef.current.push(id);
    switch (type) {
      case 'subscription':
        cleanupManager.addSubscription(id, cleanup);
        break;
      case 'timeout':
        cleanupManager.addTimeout(id, cleanup as any);
        break;
      case 'interval':
        cleanupManager.addInterval(id, cleanup as any);
        break;
      case 'listener':
        cleanupManager.addListener(id, cleanup);
        break;
    }
  };

  return { addCleanup };
};