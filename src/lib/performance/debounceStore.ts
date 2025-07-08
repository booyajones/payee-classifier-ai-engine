import { BatchJob } from '@/lib/openai/trueBatchAPI';

interface DebounceManager {
  lastUpdate: number;
  pendingUpdates: Map<string, BatchJob>;
  timer: NodeJS.Timeout | null;
}

class DebouncedStoreUpdater {
  private manager: DebounceManager = {
    lastUpdate: 0,
    pendingUpdates: new Map(),
    timer: null
  };

  private readonly DEBOUNCE_DELAY = 250; // 250ms debounce
  private readonly MIN_UPDATE_INTERVAL = 100; // Minimum 100ms between updates

  scheduleUpdate(job: BatchJob, updateFn: (job: BatchJob) => void): void {
    // Add to pending updates
    this.manager.pendingUpdates.set(job.id, job);

    // Clear existing timer
    if (this.manager.timer) {
      clearTimeout(this.manager.timer);
    }

    // Check if we can update immediately (respecting minimum interval)
    const now = Date.now();
    const timeSinceLastUpdate = now - this.manager.lastUpdate;

    if (timeSinceLastUpdate >= this.MIN_UPDATE_INTERVAL && this.manager.pendingUpdates.size <= 3) {
      // Update immediately for small batches and if enough time has passed
      this.flushUpdates(updateFn);
    } else {
      // Schedule debounced update
      this.manager.timer = setTimeout(() => {
        this.flushUpdates(updateFn);
      }, this.DEBOUNCE_DELAY);
    }
  }

  private flushUpdates(updateFn: (job: BatchJob) => void): void {
    if (this.manager.pendingUpdates.size === 0) return;

    // Apply all pending updates
    for (const job of this.manager.pendingUpdates.values()) {
      updateFn(job);
    }

    // Clear pending updates and update timestamp
    this.manager.pendingUpdates.clear();
    this.manager.lastUpdate = Date.now();
    this.manager.timer = null;

    console.log(`[DEBOUNCE STORE] Flushed ${this.manager.pendingUpdates.size} updates`);
  }

  forceFlush(updateFn: (job: BatchJob) => void): void {
    if (this.manager.timer) {
      clearTimeout(this.manager.timer);
      this.manager.timer = null;
    }
    this.flushUpdates(updateFn);
  }

  destroy(): void {
    if (this.manager.timer) {
      clearTimeout(this.manager.timer);
      this.manager.timer = null;
    }
    this.manager.pendingUpdates.clear();
  }
}

// Global debounced updater instance
export const debouncedStoreUpdater = new DebouncedStoreUpdater();