
// Simple event emitter for batch job updates
const jobUpdateListeners = new Set<() => void>();

export const emitBatchJobUpdate = () => {
  jobUpdateListeners.forEach(listener => listener());
};

export const useBatchJobEventListener = (callback: () => void) => {
  jobUpdateListeners.add(callback);
  
  return () => {
    jobUpdateListeners.delete(callback);
  };
};
