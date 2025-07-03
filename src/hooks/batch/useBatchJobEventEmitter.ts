
// Simple event emitter for batch job updates with improved rate limiting
const jobUpdateListeners = new Set<() => void>();
let lastEmitTime = 0;
const EMIT_THROTTLE_MS = 250; // Reduced from 500ms for more responsive updates

export const emitBatchJobUpdate = () => {
  const now = Date.now();
  
  // Less aggressive throttling for better responsiveness
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
  // Reduced callback throttling for better responsiveness
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
