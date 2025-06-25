
// Simple event emitter for batch job updates with rate limiting
const jobUpdateListeners = new Set<() => void>();
let lastEmitTime = 0;
const EMIT_THROTTLE_MS = 500; // Throttle emissions to max once per 500ms

export const emitBatchJobUpdate = () => {
  const now = Date.now();
  
  // Throttle rapid fire events
  if (now - lastEmitTime < EMIT_THROTTLE_MS) {
    console.log('[BATCH EVENT] Throttling batch job update event');
    return;
  }
  
  lastEmitTime = now;
  console.log(`[BATCH EVENT] Emitting batch job update to ${jobUpdateListeners.size} listeners`);
  
  // Use setTimeout to prevent blocking and allow for cleanup
  setTimeout(() => {
    jobUpdateListeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('[BATCH EVENT] Error in event listener:', error);
      }
    });
  }, 0);
};

export const useBatchJobEventListener = (callback: () => void) => {
  // Wrap callback to prevent multiple rapid calls
  let isProcessing = false;
  const throttledCallback = async () => {
    if (isProcessing) {
      console.log('[BATCH EVENT] Callback already processing, skipping...');
      return;
    }
    
    isProcessing = true;
    try {
      await callback();
    } catch (error) {
      console.error('[BATCH EVENT] Error in event callback:', error);
    } finally {
      isProcessing = false;
    }
  };
  
  jobUpdateListeners.add(throttledCallback);
  
  return () => {
    jobUpdateListeners.delete(throttledCallback);
  };
};
